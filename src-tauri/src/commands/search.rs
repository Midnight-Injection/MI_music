use crate::api::{LyricInfo, MusicInfo, Quality};
use crate::api::kugou::KugouSource;
use crate::api::helpers::{apply_media_request_headers, build_client, build_media_client};
use crate::api::SourceRegistry;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use std::{path::Path, path::PathBuf};
use tauri::{AppHandle, Manager};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use url::Url;

/// Global source registry
static SOURCE_REGISTRY: OnceLock<SourceRegistry> = OnceLock::new();

/// Get or initialize the source registry
fn get_registry() -> &'static SourceRegistry {
    SOURCE_REGISTRY.get_or_init(|| SourceRegistry::new())
}

/// Search result wrapper for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MusicInfoWrapper {
    pub id: String,
    pub name: String,
    pub singer: String,
    pub source: String,
    pub songmid: String,
    pub album_id: String,
    pub hash: Option<String>,
    pub str_media_mid: Option<String>,
    pub copyright_id: Option<String>,
    pub interval: String,
    pub album_name: String,
    pub types: Vec<crate::api::QualityInfo>,
    pub img: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedMediaBlob {
    pub mime_type: String,
    pub bytes: Vec<u8>,
}

impl From<MusicInfo> for MusicInfoWrapper {
    fn from(info: MusicInfo) -> Self {
        Self {
            id: format!("{}_{}", info.source, info.songmid),
            name: info.name,
            singer: info.singer,
            source: info.source,
            songmid: info.songmid,
            album_id: info.album_id,
            hash: info.hash,
            str_media_mid: info.str_media_mid,
            copyright_id: info.copyright_id,
            interval: info.interval,
            album_name: info.album_name,
            types: info.types,
            img: info.img,
        }
    }
}

/// Search for music from specified source
#[tauri::command]
pub async fn search_music_sources(
    keyword: String,
    source: String,
    page: u32,
    limit: u32,
) -> Result<Vec<MusicInfoWrapper>, String> {
    let registry = get_registry();

    // Get the requested source
    let music_source = registry.get_source(&source)
        .ok_or_else(|| format!("Unknown music source: {}", source))?;

    // Perform search
    let results = music_source.search(&keyword, page, limit)
        .await
        .map_err(|e| e.to_string())?;

    // Convert to wrapper format
    let wrapped: Vec<MusicInfoWrapper> = results
        .into_iter()
        .map(MusicInfoWrapper::from)
        .collect();

    Ok(wrapped)
}

/// Get song playback URL
#[tauri::command]
pub async fn get_song_url(
    song_id: String,
    source: String,
    quality: String,
    album_id: Option<String>,
) -> Result<String, String> {
    let registry = get_registry();

    let quality_enum = Quality::from_str(&quality)
        .ok_or_else(|| format!("Invalid quality: {}", quality))?;

    if source == "kg" {
        if let Some(album_id) = album_id.filter(|value| !value.is_empty()) {
            return KugouSource::new()
                .get_song_url_by_hash_and_album(&song_id, &album_id, quality_enum)
                .await
                .map_err(|e| e.to_string());
        }
    }

    let music_source = registry.get_source(&source)
        .ok_or_else(|| format!("Unknown music source: {}", source))?;

    music_source.get_song_url(&song_id, quality_enum)
        .await
        .map_err(|e| e.to_string())
}

/// Get lyrics for a song
#[tauri::command]
pub async fn get_lyric(
    song_id: String,
    source: String,
) -> Result<LyricInfo, String> {
    let registry = get_registry();

    let music_source = registry.get_source(&source)
        .ok_or_else(|| format!("Unknown music source: {}", source))?;

    music_source.get_lyric(&song_id)
        .await
        .map_err(|e| e.to_string())
}

/// Get songs from a music source playlist (API-based)
#[tauri::command]
pub async fn get_source_playlist(
    playlist_id: String,
    source: String,
    page: u32,
    page_size: u32,
) -> Result<Vec<MusicInfoWrapper>, String> {
    let registry = get_registry();

    let music_source = registry.get_source(&source)
        .ok_or_else(|| format!("Unknown music source: {}", source))?;

    let results = music_source.get_playlist(&playlist_id, page, page_size)
        .await
        .map_err(|e| e.to_string())?;

    let wrapped: Vec<MusicInfoWrapper> = results
        .into_iter()
        .map(MusicInfoWrapper::from)
        .collect();

    Ok(wrapped)
}

/// Get list of available music sources
#[tauri::command]
pub fn get_available_sources() -> Vec<String> {
    get_registry().list_sources()
}

/// Probe whether a media URL is reachable enough for frontend playback.
#[tauri::command]
pub async fn probe_media_url(url: String) -> Result<bool, String> {
    let client = build_client();
    let request = apply_media_request_headers(client.get(&url), &url).header("Range", "bytes=0-1");
    let response = request.send().await.map_err(|e: reqwest::Error| e.to_string())?;

    Ok(response.status().is_success() || response.status().as_u16() == 206)
}

fn infer_media_extension(url: &str, content_type: Option<&str>) -> &'static str {
    if let Ok(parsed) = Url::parse(url) {
        if let Some(ext) = Path::new(parsed.path()).extension().and_then(|value| value.to_str()) {
            let normalized = ext.trim().to_ascii_lowercase();
            match normalized.as_str() {
                "mp3" => return "mp3",
                "flac" => return "flac",
                "m4a" => return "m4a",
                "aac" => return "aac",
                "ogg" => return "ogg",
                "wav" => return "wav",
                _ => {}
            }
        }
    }

    match content_type.unwrap_or_default().to_ascii_lowercase().as_str() {
        value if value.contains("audio/flac") || value.contains("audio/x-flac") => "flac",
        value if value.contains("audio/aac") => "aac",
        value if value.contains("audio/mp4") || value.contains("audio/x-m4a") => "m4a",
        value if value.contains("audio/ogg") => "ogg",
        value if value.contains("audio/wav") || value.contains("audio/x-wav") => "wav",
        _ => "mp3",
    }
}

fn build_cached_media_path(cache_root: &Path, url: &str, content_type: Option<&str>) -> PathBuf {
    let file_name = format!(
        "{:x}.{}",
        md5::compute(url.as_bytes()),
        infer_media_extension(url, content_type),
    );
    cache_root.join(file_name)
}

fn infer_mime_type(path: &Path) -> String {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "flac" => "audio/flac".to_string(),
        "m4a" => "audio/mp4".to_string(),
        "aac" => "audio/aac".to_string(),
        "ogg" => "audio/ogg".to_string(),
        "wav" => "audio/wav".to_string(),
        _ => "audio/mpeg".to_string(),
    }
}

#[tauri::command]
pub async fn cache_media_url(app: AppHandle, url: String) -> Result<String, String> {
    let normalized = url.trim();
    if normalized.is_empty() {
        return Err("Empty media url".to_string());
    }

    let cache_root = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to resolve cache dir: {}", e))?
        .join("media-cache");
    fs::create_dir_all(&cache_root)
        .await
        .map_err(|e| format!("Failed to create media cache dir: {}", e))?;

    let client = build_media_client();
    let request = apply_media_request_headers(client.get(normalized), normalized);
    let response = request
        .send()
        .await
        .map_err(|e: reqwest::Error| format!("Failed to fetch media: {}", e))?;

    if !response.status().is_success() && response.status().as_u16() != 206 {
        return Err(format!("Media request failed with status {}", response.status()));
    }

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value: &reqwest::header::HeaderValue| value.to_str().ok())
        .map(str::to_string);
    let target_path = build_cached_media_path(&cache_root, normalized, content_type.as_deref());

    if let Ok(metadata) = fs::metadata(&target_path).await {
        if metadata.len() > 0 {
            return Ok(target_path.to_string_lossy().to_string());
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

    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn load_cached_media_blob(app: AppHandle, url: String) -> Result<CachedMediaBlob, String> {
    let file_path = cache_media_url(app, url).await?;
    let path = PathBuf::from(&file_path);
    let bytes = fs::read(&path)
        .await
        .map_err(|e| format!("Failed to read cached media: {}", e))?;

    Ok(CachedMediaBlob {
        mime_type: infer_mime_type(&path),
        bytes,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_registry_initialization() {
        let registry = get_registry();
        assert!(registry.has_source("kw"));
        assert!(registry.has_source("kg"));
        assert!(registry.has_source("wy"));
        assert!(registry.has_source("tx"));
        assert!(registry.has_source("mg"));
    }

    #[test]
    fn test_available_sources() {
        let sources = get_available_sources();
        assert!(sources.contains(&"kw".to_string()));
        assert!(sources.contains(&"kg".to_string()));
        assert!(sources.contains(&"wy".to_string()));
        assert!(sources.contains(&"tx".to_string()));
        assert!(sources.contains(&"mg".to_string()));
    }
}
