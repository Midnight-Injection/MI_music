use crate::api::helpers::{apply_media_request_headers, build_media_client};
use crate::db::get_pool;
use crate::db::models::download::{CreateDownloadTask, DownloadTask, UpdateDownloadTask};
use reqwest::Client;
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;

lazy_static::lazy_static! {
    static ref DOWNLOAD_MANAGER: Mutex<DownloadManager> = Mutex::new(DownloadManager::new());
}

struct DownloadManager {
    active_downloads: HashMap<i64, tokio::task::JoinHandle<()>>,
}

impl DownloadManager {
    fn new() -> Self {
        Self {
            active_downloads: HashMap::new(),
        }
    }

    async fn start_download(
        &mut self,
        task_id: i64,
        url: String,
        path: PathBuf,
    ) -> Result<(), String> {
        let client = build_media_client();

        let handle = tokio::spawn(async move {
            let result = Self::download_file(&client, url, path.clone(), task_id).await;
            if let Err(error) = result {
                eprintln!("Download failed for task {}: {}", task_id, error);

                if let Ok(pool) = get_pool().await {
                    let _ = mark_task_failed(&pool, task_id, &error).await;
                }

                let _ = tokio::fs::remove_file(&path).await;
            }

            let mut manager = DOWNLOAD_MANAGER.lock().await;
            manager.active_downloads.remove(&task_id);
        });

        self.active_downloads.insert(task_id, handle);
        Ok(())
    }

    async fn download_file(
        client: &Client,
        url: String,
        path: PathBuf,
        task_id: i64,
    ) -> Result<(), String> {
        let response = apply_media_request_headers(client.get(&url), &url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch: {}", e))?
            .error_for_status()
            .map_err(|e| format!("Download request failed: {}", e))?;

        let total_size = response.content_length();

        let pool = get_pool().await.map_err(|e| format!("DB error: {}", e))?;
        DownloadTask::update(
            &pool,
            task_id,
            UpdateDownloadTask {
                file_path: None,
                status: Some("downloading".to_string()),
                progress: Some(0.0),
                error: Some(String::new()),
            },
        )
        .await
        .map_err(|e| format!("Failed to mark task downloading: {}", e))?;

        let mut file = File::create(&path)
            .await
            .map_err(|e| format!("Failed to create file: {}", e))?;

        let mut downloaded = 0u64;
        let mut stream = response.bytes_stream();

        while let Some(chunk_result) = tokio_stream::StreamExt::next(&mut stream).await {
            let chunk = chunk_result.map_err(|e| format!("Failed to read chunk: {}", e))?;
            file.write_all(&chunk)
                .await
                .map_err(|e| format!("Failed to write chunk: {}", e))?;

            downloaded += chunk.len() as u64;

            if let Some(progress) = calculate_progress(downloaded, total_size) {
                let pool = get_pool().await.map_err(|e| format!("DB error: {}", e))?;
                DownloadTask::update(
                    &pool,
                    task_id,
                    UpdateDownloadTask {
                        file_path: None,
                        status: Some("downloading".to_string()),
                        progress: Some(progress),
                        error: Some(String::new()),
                    },
                )
                .await
                .map_err(|e| format!("Failed to update progress: {}", e))?;
            }
        }

        file.flush()
            .await
            .map_err(|e| format!("Failed to flush file: {}", e))?;

        let pool = get_pool().await.map_err(|e| format!("DB error: {}", e))?;

        let file_path_str = path.to_string_lossy().to_string();
        DownloadTask::update(
            &pool,
            task_id,
            UpdateDownloadTask {
                status: Some("completed".to_string()),
                progress: Some(100.0),
                error: None,
                file_path: Some(file_path_str),
            },
        )
        .await
        .map_err(|e| format!("Failed to update completion: {}", e))?;

        Ok(())
    }
}

fn calculate_progress(downloaded: u64, total_size: Option<u64>) -> Option<f64> {
    total_size
        .filter(|size| *size > 0)
        .map(|size| (downloaded as f64 / size as f64) * 100.0)
}

fn build_download_file_path(save_path: &str, filename: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(save_path);
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
    Ok(path.join(filename))
}

async fn mark_task_failed(pool: &SqlitePool, task_id: i64, error: &str) -> Result<(), String> {
    DownloadTask::update(
        pool,
        task_id,
        UpdateDownloadTask {
            file_path: None,
            status: Some("failed".to_string()),
            progress: None,
            error: Some(error.to_string()),
        },
    )
    .await
    .map_err(|e| format!("Failed to update failure status: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn create_download_task(
    song_id: Option<i64>,
    url: String,
    filename: String,
) -> Result<i64, String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;

    let task = DownloadTask::create(
        &pool,
        CreateDownloadTask {
            song_id,
            url,
            filename,
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(task.id)
}

#[tauri::command]
pub async fn get_download_tasks() -> Result<Vec<DownloadTask>, String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let tasks = DownloadTask::get_all(&pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(tasks)
}

#[tauri::command]
pub async fn get_download_task(id: i64) -> Result<Option<DownloadTask>, String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let task = DownloadTask::get_by_id(&pool, id)
        .await
        .map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
pub async fn get_download_tasks_by_status(status: String) -> Result<Vec<DownloadTask>, String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let tasks = DownloadTask::get_by_status(&pool, &status)
        .await
        .map_err(|e| e.to_string())?;
    Ok(tasks)
}

#[tauri::command]
pub async fn update_download_task(
    id: i64,
    updates: UpdateDownloadTask,
) -> Result<Option<DownloadTask>, String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let task = DownloadTask::update(&pool, id, updates)
        .await
        .map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
pub async fn delete_download_task(id: i64) -> Result<bool, String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;

    {
        let mut manager = DOWNLOAD_MANAGER.lock().await;
        if let Some(handle) = manager.active_downloads.remove(&id) {
            handle.abort();
        }
    }

    let deleted = DownloadTask::delete(&pool, id)
        .await
        .map_err(|e| e.to_string())?;
    Ok(deleted)
}

#[tauri::command]
pub async fn start_download(id: i64, save_path: String) -> Result<(), String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let task = DownloadTask::get_by_id(&pool, id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Task not found")?;

    let file_path = build_download_file_path(&save_path, &task.filename)?;

    let mut manager = DOWNLOAD_MANAGER.lock().await;
    manager.start_download(task.id, task.url, file_path).await?;
    Ok(())
}

#[tauri::command]
pub async fn pause_download(id: i64) -> Result<(), String> {
    let mut manager = DOWNLOAD_MANAGER.lock().await;
    if let Some(handle) = manager.active_downloads.remove(&id) {
        handle.abort();

        let pool = get_pool().await.map_err(|e| e.to_string())?;
        DownloadTask::update(
            &pool,
            id,
            UpdateDownloadTask {
                file_path: None,
                status: Some("paused".to_string()),
                progress: None,
                error: None,
            },
        )
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn resume_download(id: i64, save_path: String) -> Result<(), String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let task = DownloadTask::get_by_id(&pool, id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Task not found")?;

    let file_path = build_download_file_path(&save_path, &task.filename)?;

    let mut manager = DOWNLOAD_MANAGER.lock().await;
    manager.start_download(task.id, task.url, file_path).await?;
    Ok(())
}

#[tauri::command]
pub async fn open_download_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn select_download_folder(_app: tauri::AppHandle) -> Result<Option<String>, String> {
    // For now, return None until we figure out the correct API
    // TODO: Implement folder picker correctly
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    #[test]
    fn calculate_progress_handles_missing_or_zero_content_length() {
        assert_eq!(calculate_progress(50, None), None);
        assert_eq!(calculate_progress(50, Some(0)), None);
        assert_eq!(calculate_progress(50, Some(100)), Some(50.0));
    }

    #[test]
    fn build_download_file_path_creates_parent_directory() {
        let base = std::env::temp_dir().join(format!(
            "jiyu_music_download_test_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let save_path = base.join("nested/folder");
        let file_path =
            build_download_file_path(save_path.to_str().unwrap(), "track.flac").unwrap();

        assert!(save_path.exists());
        assert_eq!(file_path.file_name().unwrap(), "track.flac");

        let _ = std::fs::remove_dir_all(base);
    }

    #[tokio::test]
    async fn mark_task_failed_persists_failed_status_and_error() {
        let db = Database::new(":memory:").await.unwrap();
        db.migrate().await.unwrap();
        let pool = db.pool();

        let task = DownloadTask::create(
            pool,
            CreateDownloadTask {
                song_id: None,
                url: "https://example.com/song.flac".to_string(),
                filename: "song.flac".to_string(),
            },
        )
        .await
        .unwrap();

        mark_task_failed(&pool, task.id, "network timeout")
            .await
            .unwrap();

        let updated = DownloadTask::get_by_id(pool, task.id)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(updated.status, "failed");
        assert_eq!(updated.error.as_deref(), Some("network timeout"));
    }
}
