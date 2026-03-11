use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, FromRow};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePlaylist {
    pub name: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePlaylist {
    pub name: Option<String>,
    pub description: Option<String>,
    pub cover_url: Option<String>,
}

impl Playlist {
    /// Create a new playlist
    pub async fn create(
        pool: &SqlitePool,
        input: CreatePlaylist,
    ) -> Result<Self, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query_as::<_, Playlist>(
            r#"
            INSERT INTO playlists (name, description, cover_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            RETURNING *
            "#
        )
        .bind(&input.name)
        .bind(&input.description)
        .bind(&input.cover_url)
        .bind(&now)
        .bind(&now)
        .fetch_one(pool)
        .await?;

        Ok(result)
    }

    /// Get a playlist by ID
    pub async fn get_by_id(
        pool: &SqlitePool,
        id: i64,
    ) -> Result<Option<Self>, sqlx::Error> {
        let result = sqlx::query_as::<_, Playlist>(
            "SELECT * FROM playlists WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(result)
    }

    /// Get all playlists
    pub async fn get_all(
        pool: &SqlitePool,
    ) -> Result<Vec<Self>, sqlx::Error> {
        let results = sqlx::query_as::<_, Playlist>(
            "SELECT * FROM playlists ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await?;

        Ok(results)
    }

    /// Update a playlist
    pub async fn update(
        pool: &SqlitePool,
        id: i64,
        input: UpdatePlaylist,
    ) -> Result<Option<Self>, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query_as::<_, Playlist>(
            r#"
            UPDATE playlists
            SET name = COALESCE(?, name),
                description = COALESCE(?, description),
                cover_url = COALESCE(?, cover_url),
                updated_at = ?
            WHERE id = ?
            RETURNING *
            "#
        )
        .bind(&input.name)
        .bind(&input.description)
        .bind(&input.cover_url)
        .bind(&now)
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(result)
    }

    /// Delete a playlist
    pub async fn delete(
        pool: &SqlitePool,
        id: i64,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM playlists WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Add a song to a playlist
    pub async fn add_song(
        pool: &SqlitePool,
        playlist_id: i64,
        song_id: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_songs WHERE playlist_id = ?))"
        )
        .bind(playlist_id)
        .bind(song_id)
        .bind(playlist_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Remove a song from a playlist
    pub async fn remove_song(
        pool: &SqlitePool,
        playlist_id: i64,
        song_id: i64,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?"
        )
        .bind(playlist_id)
        .bind(song_id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get all songs in a playlist
    pub async fn get_songs(
        pool: &SqlitePool,
        playlist_id: i64,
    ) -> Result<Vec<super::song::Song>, sqlx::Error> {
        let songs = sqlx::query_as::<_, super::song::Song>(
            r#"
            SELECT s.* FROM songs s
            INNER JOIN playlist_songs ps ON s.id = ps.song_id
            WHERE ps.playlist_id = ?
            ORDER BY ps.position
            "#
        )
        .bind(playlist_id)
        .fetch_all(pool)
        .await?;

        Ok(songs)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_playlist_operations() {
        let pool = sqlx::SqlitePool::connect(":memory:").await.unwrap();

        // Run migrations first
        crate::db::migrations::run(&pool).await.unwrap();

        // Create a playlist
        let input = CreatePlaylist {
            name: "Test Playlist".to_string(),
            description: Some("A test playlist".to_string()),
            cover_url: None,
        };

        let playlist = Playlist::create(&pool, input).await.unwrap();
        assert_eq!(playlist.name, "Test Playlist");

        // Get the playlist
        let found = Playlist::get_by_id(&pool, playlist.id).await.unwrap();
        assert!(found.is_some());

        // Update the playlist
        let update = UpdatePlaylist {
            name: Some("Updated Playlist".to_string()),
            description: None,
            cover_url: None,
        };

        let updated = Playlist::update(&pool, playlist.id, update).await.unwrap();
        assert!(updated.is_some());
        assert_eq!(updated.unwrap().name, "Updated Playlist");

        // Delete the playlist
        let deleted = Playlist::delete(&pool, playlist.id).await.unwrap();
        assert!(deleted);

        let found = Playlist::get_by_id(&pool, playlist.id).await.unwrap();
        assert!(found.is_none());
    }
}
