use crate::api::helpers::{apply_media_request_headers, build_media_client};
use crate::db::get_pool;
use crate::db::models::playback_cache::{PlaybackCacheEntry, UpsertPlaybackCacheEntry};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use tokio::fs;
use tokio::io::AsyncWriteExt;

const MUSIC_CACHE_DIR_NAME: &str = "musiccache";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackCacheStats {
    pub cache_dir: String,
    pub total_size_bytes: i64,
    pub file_count: usize,
    pub record_count: usize,
}

fn infer_media_extension(url: &str, content_type: Option<&str>) -> String {
    if let Ok(parsed) = url::Url::parse(url) {
        if let Some(extension) = Path::new(parsed.path())
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| value.to_ascii_lowercase())
        {
            match extension.as_str() {
                "mp3" | "flac" | "aac" | "m4a" | "ogg" | "wav" => {
                    return extension;
                }
                _ => {}
            }
        }
    }

    match content_type
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        value if value.contains("audio/flac") || value.contains("audio/x-flac") => {
            "flac".to_string()
        }
        value if value.contains("audio/aac") => "aac".to_string(),
        value if value.contains("audio/mp4") || value.contains("audio/x-m4a") => "m4a".to_string(),
        value if value.contains("audio/ogg") => "ogg".to_string(),
        value if value.contains("audio/wav") || value.contains("audio/x-wav") => "wav".to_string(),
        _ => "mp3".to_string(),
    }
}

fn build_cached_media_path(cache_root: &Path, url: &str, content_type: Option<&str>) -> PathBuf {
    let file_name = format!(
        "{:x}.{}",
        md5::compute(url.as_bytes()),
        infer_media_extension(url, content_type)
    );
    cache_root.join(file_name)
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn normalize_remote_url(url: &str) -> Result<String, String> {
    let normalized = url.trim().to_string();
    if normalized.is_empty() {
        return Err("Empty media url".to_string());
    }
    if !normalized.starts_with("http://") && !normalized.starts_with("https://") {
        return Err("Only remote playback urls can be cached".to_string());
    }
    Ok(normalized)
}

fn resolve_music_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    Ok(base_dir.join(MUSIC_CACHE_DIR_NAME))
}

async fn ensure_music_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = resolve_music_cache_dir(app)?;
    fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("Failed to create music cache dir: {}", e))?;
    Ok(dir)
}

async fn remove_file_if_exists(path: &str) {
    let _ = fs::remove_file(path).await;
}

async fn get_existing_entry(
    track_key: &str,
    audio_quality: &str,
) -> Result<Option<PlaybackCacheEntry>, String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let entry = PlaybackCacheEntry::get(&pool, track_key, audio_quality)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(existing) = entry {
        if let Some(local_path) = existing.local_file_path.clone() {
            if fs::metadata(&local_path).await.is_err() {
                let cleared =
                    PlaybackCacheEntry::clear_fields(&pool, track_key, audio_quality, false, true)
                        .await
                        .map_err(|e| e.to_string())?;
                return Ok(cleared);
            }
        }

        let touched = PlaybackCacheEntry::touch_accessed_at(&pool, track_key, audio_quality)
            .await
            .map_err(|e| e.to_string())?;
        return Ok(touched.or(Some(existing)));
    }

    Ok(None)
}

async fn collect_cache_stats(cache_dir: &Path) -> Result<PlaybackCacheStats, String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let entries = PlaybackCacheEntry::list_all(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut total_size_bytes = 0_i64;
    let mut file_count = 0_usize;

    for entry in &entries {
        if let Some(path) = entry.local_file_path.as_deref() {
            if let Ok(metadata) = fs::metadata(path).await {
                total_size_bytes += metadata.len() as i64;
                file_count += 1;
            }
        }
    }

    Ok(PlaybackCacheStats {
        cache_dir: cache_dir.to_string_lossy().to_string(),
        total_size_bytes,
        file_count,
        record_count: entries.len(),
    })
}

#[tauri::command]
pub async fn get_cached_playback(
    track_key: String,
    audio_quality: String,
) -> Result<Option<PlaybackCacheEntry>, String> {
    get_existing_entry(&track_key, &audio_quality).await
}

#[tauri::command]
pub async fn upsert_cached_playback(
    entry: UpsertPlaybackCacheEntry,
) -> Result<PlaybackCacheEntry, String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    PlaybackCacheEntry::upsert(&pool, entry)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_cached_playback(
    track_key: String,
    audio_quality: String,
    clear_remote_url: bool,
    clear_local_file: bool,
) -> Result<Option<PlaybackCacheEntry>, String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let existing = PlaybackCacheEntry::get(&pool, &track_key, &audio_quality)
        .await
        .map_err(|e| e.to_string())?;

    if clear_local_file {
        if let Some(local_path) = existing
            .as_ref()
            .and_then(|entry| entry.local_file_path.as_deref())
        {
            remove_file_if_exists(local_path).await;
        }
    }

    PlaybackCacheEntry::clear_fields(
        &pool,
        &track_key,
        &audio_quality,
        clear_remote_url,
        clear_local_file,
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cache_playback_media(
    app: AppHandle,
    track_key: String,
    audio_quality: String,
    url: String,
    source_id: Option<String>,
    channel: Option<String>,
    resolver: Option<String>,
) -> Result<PlaybackCacheEntry, String> {
    let normalized = normalize_remote_url(&url)?;
    let cache_root = ensure_music_cache_dir(&app).await?;
    let client = build_media_client();
    let request = apply_media_request_headers(client.get(&normalized), &normalized);
    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch media: {}", e))?;

    if !response.status().is_success() && response.status().as_u16() != 206 {
        return Err(format!(
            "Media request failed with status {}",
            response.status()
        ));
    }

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let target_path = build_cached_media_path(&cache_root, &normalized, content_type.as_deref());

    if let Ok(metadata) = fs::metadata(&target_path).await {
        if metadata.len() > 0 {
            let pool = get_pool().await.map_err(|e| e.to_string())?;
            return PlaybackCacheEntry::upsert(
                &pool,
                UpsertPlaybackCacheEntry {
                    track_key,
                    audio_quality,
                    remote_url: Some(normalized),
                    local_file_path: Some(target_path.to_string_lossy().to_string()),
                    source_id,
                    channel,
                    resolver,
                    file_size_bytes: Some(metadata.len() as i64),
                    last_verified_at: Some(now_iso()),
                    touch_accessed_at: Some(true),
                },
            )
            .await
            .map_err(|e| e.to_string());
        }
    }

    let temp_path = target_path.with_extension("part");
    let mut file = fs::File::create(&temp_path)
        .await
        .map_err(|e| format!("Failed to create media cache file: {}", e))?;
    let mut stream = response.bytes_stream();

    while let Some(chunk_result) = tokio_stream::StreamExt::next(&mut stream).await {
        let chunk = chunk_result.map_err(|e| format!("Failed to read media stream: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Failed to write media cache: {}", e))?;
    }

    file.flush()
        .await
        .map_err(|e| format!("Failed to flush media cache: {}", e))?;
    drop(file);

    fs::rename(&temp_path, &target_path)
        .await
        .map_err(|e| format!("Failed to finalize media cache: {}", e))?;

    let metadata = fs::metadata(&target_path)
        .await
        .map_err(|e| format!("Failed to stat cached media: {}", e))?;
    let pool = get_pool().await.map_err(|e| e.to_string())?;

    PlaybackCacheEntry::upsert(
        &pool,
        UpsertPlaybackCacheEntry {
            track_key,
            audio_quality,
            remote_url: Some(normalized),
            local_file_path: Some(target_path.to_string_lossy().to_string()),
            source_id,
            channel,
            resolver,
            file_size_bytes: Some(metadata.len() as i64),
            last_verified_at: Some(now_iso()),
            touch_accessed_at: Some(true),
        },
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn prune_playback_cache(
    app: AppHandle,
    capacity_mb: u64,
) -> Result<PlaybackCacheStats, String> {
    let capacity_bytes = (capacity_mb as i64).saturating_mul(1024 * 1024);
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let cache_dir = ensure_music_cache_dir(&app).await?;
    let entries = PlaybackCacheEntry::list_all(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut total_size_bytes = 0_i64;
    let mut local_entries: Vec<PlaybackCacheEntry> = Vec::new();

    for entry in entries {
        if let Some(local_path) = entry.local_file_path.clone() {
            match fs::metadata(&local_path).await {
                Ok(metadata) => {
                    total_size_bytes += metadata.len() as i64;
                    local_entries.push(entry);
                }
                Err(_) => {
                    let _ = PlaybackCacheEntry::clear_fields(
                        &pool,
                        &entry.track_key,
                        &entry.audio_quality,
                        false,
                        true,
                    )
                    .await;
                }
            }
        }
    }

    if capacity_bytes <= 0 {
        for entry in &local_entries {
            if let Some(local_path) = entry.local_file_path.as_deref() {
                remove_file_if_exists(local_path).await;
            }
            let _ = PlaybackCacheEntry::clear_fields(
                &pool,
                &entry.track_key,
                &entry.audio_quality,
                false,
                true,
            )
            .await;
        }
        return collect_cache_stats(&cache_dir).await;
    }

    for entry in local_entries {
        if total_size_bytes <= capacity_bytes {
            break;
        }

        if let Some(local_path) = entry.local_file_path.as_deref() {
            let file_size = fs::metadata(local_path)
                .await
                .ok()
                .map(|metadata| metadata.len() as i64)
                .unwrap_or(entry.file_size_bytes.max(0));
            remove_file_if_exists(local_path).await;
            let _ = PlaybackCacheEntry::clear_fields(
                &pool,
                &entry.track_key,
                &entry.audio_quality,
                false,
                true,
            )
            .await;
            total_size_bytes = (total_size_bytes - file_size).max(0);
        }
    }

    collect_cache_stats(&cache_dir).await
}

#[tauri::command]
pub async fn get_playback_cache_stats(app: AppHandle) -> Result<PlaybackCacheStats, String> {
    let cache_dir = ensure_music_cache_dir(&app).await?;
    collect_cache_stats(&cache_dir).await
}
