use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, FromRow};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Song {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<i64>, // in seconds
    pub cover_url: Option<String>,
    pub audio_url: String,
    pub source: String, // e.g., "netease", "qq", "kugou"
    pub source_id: String, // ID from the source platform
    pub added_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSong {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<i64>,
    pub cover_url: Option<String>,
    pub audio_url: String,
    pub source: String,
    pub source_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSong {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<i64>,
    pub cover_url: Option<String>,
    pub audio_url: Option<String>,
}

impl Song {
    /// Create a new song
    pub async fn create(
        pool: &SqlitePool,
        input: CreateSong,
    ) -> Result<Self, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query_as::<_, Song>(
            r#"
            INSERT INTO songs (title, artist, album, duration, cover_url, audio_url, source, source_id, added_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#
        )
        .bind(&input.title)
        .bind(&input.artist)
        .bind(&input.album)
        .bind(&input.duration)
        .bind(&input.cover_url)
        .bind(&input.audio_url)
        .bind(&input.source)
        .bind(&input.source_id)
        .bind(&now)
        .fetch_one(pool)
        .await?;

        Ok(result)
    }

    /// Get a song by ID
    pub async fn get_by_id(
        pool: &SqlitePool,
        id: i64,
    ) -> Result<Option<Self>, sqlx::Error> {
        let result = sqlx::query_as::<_, Song>(
            "SELECT * FROM songs WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(result)
    }

    /// Get a song by source and source_id
    pub async fn get_by_source(
        pool: &SqlitePool,
        source: &str,
        source_id: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        let result = sqlx::query_as::<_, Song>(
            "SELECT * FROM songs WHERE source = ? AND source_id = ?"
        )
        .bind(source)
        .bind(source_id)
        .fetch_optional(pool)
        .await?;

        Ok(result)
    }

    /// Get all songs
    pub async fn get_all(
        pool: &SqlitePool,
    ) -> Result<Vec<Self>, sqlx::Error> {
        let results = sqlx::query_as::<_, Song>(
            "SELECT * FROM songs ORDER BY added_at DESC"
        )
        .fetch_all(pool)
        .await?;

        Ok(results)
    }

    /// Search songs by title or artist
    pub async fn search(
        pool: &SqlitePool,
        query: &str,
    ) -> Result<Vec<Self>, sqlx::Error> {
        let pattern = format!("%{}%", query);

        let results = sqlx::query_as::<_, Song>(
            r#"
            SELECT * FROM songs
            WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
            ORDER BY added_at DESC
            "#
        )
        .bind(&pattern)
        .bind(&pattern)
        .bind(&pattern)
        .fetch_all(pool)
        .await?;

        Ok(results)
    }

    /// Update a song
    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        input: UpdateSong,
    ) -> Result<Option<Self>, sqlx::Error> {
        let result = sqlx::query_as::<_, Song>(
            r#"
            UPDATE songs
            SET title = COALESCE(?, title),
                artist = COALESCE(?, artist),
                album = COALESCE(?, album),
                duration = COALESCE(?, duration),
                cover_url = COALESCE(?, cover_url),
                audio_url = COALESCE(?, audio_url)
            WHERE id = ?
            RETURNING *
            "#
        )
        .bind(&input.title)
        .bind(&input.artist)
        .bind(&input.album)
        .bind(&input.duration)
        .bind(&input.cover_url)
        .bind(&input.audio_url)
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(result)
    }

    /// Delete a song
    pub async fn delete(
        pool: &SqlitePool,
        id: i64,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM songs WHERE id = ?")
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
    async fn test_song_operations() {
        let pool = sqlx::SqlitePool::connect(":memory:").await.unwrap();

        // Run migrations first
        crate::db::migrations::run(&pool).await.unwrap();

        // Create a song
        let input = CreateSong {
            title: "Test Song".to_string(),
            artist: "Test Artist".to_string(),
            album: Some("Test Album".to_string()),
            duration: Some(180),
            cover_url: None,
            audio_url: "https://example.com/audio.mp3".to_string(),
            source: "netease".to_string(),
            source_id: "12345".to_string(),
        };

        let song = Song::create(&pool, input).await.unwrap();
        assert_eq!(song.title, "Test Song");

        // Get the song
        let found = Song::get_by_id(&pool, song.id).await.unwrap();
        assert!(found.is_some());

        // Get by source
        let found = Song::get_by_source(&pool, "netease", "12345").await.unwrap();
        assert!(found.is_some());

        // Search for the song
        let results = Song::search(&pool, "Test").await.unwrap();
        assert_eq!(results.len(), 1);

        // Update the song
        let update = UpdateSong {
            title: Some("Updated Song".to_string()),
            artist: None,
            album: None,
            duration: None,
            cover_url: None,
            audio_url: None,
        };

        let updated = Song::update(&pool, song.id, update).await.unwrap();
        assert!(updated.is_some());
        assert_eq!(updated.unwrap().title, "Updated Song");

        // Delete the song
        let deleted = Song::delete(&pool, song.id).await.unwrap();
        assert!(deleted);

        let found = Song::get_by_id(&pool, song.id).await.unwrap();
        assert!(found.is_none());
    }
}
