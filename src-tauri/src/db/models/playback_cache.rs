use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackCacheEntry {
    pub id: i64,
    pub track_key: String,
    pub audio_quality: String,
    pub remote_url: Option<String>,
    pub local_file_path: Option<String>,
    pub source_id: Option<String>,
    pub channel: Option<String>,
    pub resolver: Option<String>,
    pub file_size_bytes: i64,
    pub last_verified_at: Option<String>,
    pub last_accessed_at: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertPlaybackCacheEntry {
    pub track_key: String,
    pub audio_quality: String,
    pub remote_url: Option<String>,
    pub local_file_path: Option<String>,
    pub source_id: Option<String>,
    pub channel: Option<String>,
    pub resolver: Option<String>,
    pub file_size_bytes: Option<i64>,
    pub last_verified_at: Option<String>,
    pub touch_accessed_at: Option<bool>,
}

impl PlaybackCacheEntry {
    pub async fn get(
        pool: &SqlitePool,
        track_key: &str,
        audio_quality: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, PlaybackCacheEntry>(
            r#"
            SELECT *
            FROM playback_cache
            WHERE track_key = ? AND audio_quality = ?
            "#,
        )
        .bind(track_key)
        .bind(audio_quality)
        .fetch_optional(pool)
        .await
    }

    pub async fn list_all(pool: &SqlitePool) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_as::<_, PlaybackCacheEntry>(
            r#"
            SELECT *
            FROM playback_cache
            ORDER BY last_accessed_at ASC, updated_at ASC, id ASC
            "#,
        )
        .fetch_all(pool)
        .await
    }

    pub async fn upsert(
        pool: &SqlitePool,
        input: UpsertPlaybackCacheEntry,
    ) -> Result<Self, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();
        let touch_accessed_at = input.touch_accessed_at.unwrap_or(true);
        let last_accessed_at = if touch_accessed_at {
            now.clone()
        } else {
            Self::get(pool, &input.track_key, &input.audio_quality)
                .await?
                .map(|entry| entry.last_accessed_at)
                .unwrap_or_else(|| now.clone())
        };

        sqlx::query_as::<_, PlaybackCacheEntry>(
            r#"
            INSERT INTO playback_cache (
                track_key,
                audio_quality,
                remote_url,
                local_file_path,
                source_id,
                channel,
                resolver,
                file_size_bytes,
                last_verified_at,
                last_accessed_at,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(track_key, audio_quality) DO UPDATE SET
                remote_url = excluded.remote_url,
                local_file_path = excluded.local_file_path,
                source_id = excluded.source_id,
                channel = excluded.channel,
                resolver = excluded.resolver,
                file_size_bytes = excluded.file_size_bytes,
                last_verified_at = excluded.last_verified_at,
                last_accessed_at = excluded.last_accessed_at,
                updated_at = excluded.updated_at
            RETURNING *
            "#,
        )
        .bind(&input.track_key)
        .bind(&input.audio_quality)
        .bind(&input.remote_url)
        .bind(&input.local_file_path)
        .bind(&input.source_id)
        .bind(&input.channel)
        .bind(&input.resolver)
        .bind(input.file_size_bytes.unwrap_or(0))
        .bind(&input.last_verified_at)
        .bind(&last_accessed_at)
        .bind(&now)
        .bind(&now)
        .fetch_one(pool)
        .await
    }

    pub async fn touch_accessed_at(
        pool: &SqlitePool,
        track_key: &str,
        audio_quality: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query_as::<_, PlaybackCacheEntry>(
            r#"
            UPDATE playback_cache
            SET last_accessed_at = ?, updated_at = ?
            WHERE track_key = ? AND audio_quality = ?
            RETURNING *
            "#,
        )
        .bind(&now)
        .bind(&now)
        .bind(track_key)
        .bind(audio_quality)
        .fetch_optional(pool)
        .await
    }

    pub async fn clear_fields(
        pool: &SqlitePool,
        track_key: &str,
        audio_quality: &str,
        clear_remote_url: bool,
        clear_local_file: bool,
    ) -> Result<Option<Self>, sqlx::Error> {
        let existing = Self::get(pool, track_key, audio_quality).await?;
        let Some(existing) = existing else {
            return Ok(None);
        };

        let now = chrono::Utc::now().to_rfc3339();
        let remote_url = if clear_remote_url {
            None
        } else {
            existing.remote_url.clone()
        };
        let local_file_path = if clear_local_file {
            None
        } else {
            existing.local_file_path.clone()
        };
        let file_size_bytes = if clear_local_file {
            0
        } else {
            existing.file_size_bytes
        };

        sqlx::query_as::<_, PlaybackCacheEntry>(
            r#"
            UPDATE playback_cache
            SET remote_url = ?,
                local_file_path = ?,
                file_size_bytes = ?,
                updated_at = ?
            WHERE track_key = ? AND audio_quality = ?
            RETURNING *
            "#,
        )
        .bind(remote_url)
        .bind(local_file_path)
        .bind(file_size_bytes)
        .bind(&now)
        .bind(track_key)
        .bind(audio_quality)
        .fetch_optional(pool)
        .await
    }
}
