use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DownloadTask {
    pub id: i64,
    pub song_id: Option<i64>,
    pub url: String,
    pub filename: String,
    pub status: String, // "pending", "downloading", "completed", "failed"
    pub progress: f64,  // 0.0 to 100.0
    pub error: Option<String>,
    pub file_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDownloadTask {
    pub song_id: Option<i64>,
    pub url: String,
    pub filename: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDownloadTask {
    pub status: Option<String>,
    pub progress: Option<f64>,
    pub error: Option<String>,
    pub file_path: Option<String>,
}

impl DownloadTask {
    /// Create a new download task
    pub async fn create(pool: &SqlitePool, input: CreateDownloadTask) -> Result<Self, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query_as::<_, DownloadTask>(
            r#"
            INSERT INTO download_tasks (song_id, url, filename, status, progress, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', 0.0, ?, ?)
            RETURNING *
            "#
        )
        .bind(&input.song_id)
        .bind(&input.url)
        .bind(&input.filename)
        .bind(&now)
        .bind(&now)
        .fetch_one(pool)
        .await?;

        Ok(result)
    }

    /// Get a download task by ID
    pub async fn get_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Self>, sqlx::Error> {
        let result = sqlx::query_as::<_, DownloadTask>("SELECT * FROM download_tasks WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;

        Ok(result)
    }

    /// Get all download tasks
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<Self>, sqlx::Error> {
        let results = sqlx::query_as::<_, DownloadTask>(
            "SELECT * FROM download_tasks ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await?;

        Ok(results)
    }

    /// Get download tasks by status
    pub async fn get_by_status(pool: &SqlitePool, status: &str) -> Result<Vec<Self>, sqlx::Error> {
        let results = sqlx::query_as::<_, DownloadTask>(
            "SELECT * FROM download_tasks WHERE status = ? ORDER BY created_at DESC",
        )
        .bind(status)
        .fetch_all(pool)
        .await?;

        Ok(results)
    }

    /// Get pending download tasks
    pub async fn get_pending(pool: &SqlitePool) -> Result<Vec<Self>, sqlx::Error> {
        Self::get_by_status(pool, "pending").await
    }

    /// Update a download task
    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        input: UpdateDownloadTask,
    ) -> Result<Option<Self>, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query_as::<_, DownloadTask>(
            r#"
            UPDATE download_tasks
            SET status = COALESCE(?, status),
                progress = COALESCE(?, progress),
                error = COALESCE(?, error),
                file_path = COALESCE(?, file_path),
                updated_at = ?
            WHERE id = ?
            RETURNING *
            "#,
        )
        .bind(&input.status)
        .bind(&input.progress)
        .bind(&input.error)
        .bind(&input.file_path)
        .bind(&now)
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(result)
    }

    /// Delete a download task
    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM download_tasks WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_download_task_operations() {
        let pool = sqlx::SqlitePool::connect(":memory:").await.unwrap();

        // Run migrations first
        crate::db::migrations::run(&pool).await.unwrap();

        // Create a download task
        let input = CreateDownloadTask {
            song_id: None,
            url: "https://example.com/song.mp3".to_string(),
            filename: "song.mp3".to_string(),
        };

        let task = DownloadTask::create(&pool, input).await.unwrap();
        assert_eq!(task.status, "pending");
        assert_eq!(task.progress, 0.0);

        // Get the task
        let found = DownloadTask::get_by_id(&pool, task.id).await.unwrap();
        assert!(found.is_some());

        // Get pending tasks
        let pending = DownloadTask::get_pending(&pool).await.unwrap();
        assert_eq!(pending.len(), 1);

        // Update the task
        let update = UpdateDownloadTask {
            status: Some("downloading".to_string()),
            progress: Some(50.0),
            error: None,
            file_path: None,
        };

        let updated = DownloadTask::update(&pool, task.id, update).await.unwrap();
        assert!(updated.is_some());
        assert_eq!(updated.unwrap().status, "downloading");

        // Delete the task
        let deleted = DownloadTask::delete(&pool, task.id).await.unwrap();
        assert!(deleted);

        let found = DownloadTask::get_by_id(&pool, task.id).await.unwrap();
        assert!(found.is_none());
    }
}
