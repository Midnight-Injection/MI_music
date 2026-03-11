use crate::db::models::download::{CreateDownloadTask, DownloadTask, UpdateDownloadTask};
use crate::db::get_pool;
use std::path::PathBuf;
use std::fs;
use tauri::AppHandle;
use tokio::sync::Mutex;
use std::collections::HashMap;
use reqwest::Client;
use tokio::io::AsyncWriteExt;
use tokio::fs::File;

lazy_static::lazy_static! {
    static ref DOWNLOAD_MANAGER: Mutex<DownloadManager> = Mutex::new(DownloadManager::new());
}

struct DownloadManager {
    active_downloads: HashMap<i64, tokio::task::JoinHandle<()>>,
    client: Client,
}

impl DownloadManager {
    fn new() -> Self {
        Self {
            active_downloads: HashMap::new(),
            client: Client::new(),
        }
    }

    async fn start_download(&mut self, task_id: i64, url: String, path: PathBuf) -> Result<(), String> {
        let client = self.client.clone();

        let handle = tokio::spawn(async move {
            if let Err(e) = Self::download_file(&client, url, path, task_id).await {
                eprintln!("Download failed for task {}: {}", task_id, e);
            }
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
        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch: {}", e))?;

        let total_size = response
            .content_length()
            .ok_or("Failed to get content length")?;

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
            let progress = (downloaded as f64 / total_size as f64) * 100.0;

            let pool = get_pool().await.map_err(|e| format!("DB error: {}", e))?;
            DownloadTask::update(
                &pool,
                task_id,
                UpdateDownloadTask {
                    file_path: None,
                    status: Some("downloading".to_string()),
                    progress: Some(progress),
                    error: None,
                },
            )
            .await
            .map_err(|e| format!("Failed to update progress: {}", e))?;
        }

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

    let path = PathBuf::from(&save_path);
    fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let file_path = path.join(&task.filename);

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

    let path = PathBuf::from(&save_path);
    let file_path = path.join(&task.filename);

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
pub async fn select_download_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    // For now, return None until we figure out the correct API
    // TODO: Implement folder picker correctly
    Ok(None)
}
