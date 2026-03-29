use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Song {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<i64>, // in seconds
    pub cover_url: Option<String>,
    pub audio_url: String,
    pub source: String,    // e.g., "netease", "qq", "kugou"
    pub source_id: String, // ID from the source platform
    pub songmid: Option<String>,
    pub hash: Option<String>,
    pub str_media_mid: Option<String>,
    pub copyright_id: Option<String>,
    pub album_id: Option<String>,
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
    pub songmid: Option<String>,
    pub hash: Option<String>,
    pub str_media_mid: Option<String>,
    pub copyright_id: Option<String>,
    pub album_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSong {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<i64>,
    pub cover_url: Option<String>,
    pub audio_url: Option<String>,
    pub songmid: Option<String>,
    pub hash: Option<String>,
    pub str_media_mid: Option<String>,
    pub copyright_id: Option<String>,
    pub album_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistTrackInput {
    pub id: String,
    pub name: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration: Option<i64>,
    pub cover: Option<String>,
    pub source: String,
    pub source_id: String,
    pub songmid: Option<String>,
    pub hash: Option<String>,
    pub str_media_mid: Option<String>,
    pub copyright_id: Option<String>,
    pub album_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredTrack {
    pub storage_song_id: i64,
    pub id: String,
    pub name: String,
    pub artist: String,
    pub album: String,
    pub duration: i64,
    pub url: String,
    pub cover: Option<String>,
    pub source: String,
    pub source_id: String,
    pub songmid: Option<String>,
    pub hash: Option<String>,
    pub str_media_mid: Option<String>,
    pub copyright_id: Option<String>,
    pub album_id: Option<String>,
}

impl Song {
    pub fn to_stored_track(&self) -> StoredTrack {
        StoredTrack {
            storage_song_id: self.id,
            id: self
                .songmid
                .clone()
                .unwrap_or_else(|| self.source_id.clone()),
            name: self.title.clone(),
            artist: self.artist.clone(),
            album: self.album.clone().unwrap_or_default(),
            duration: self.duration.unwrap_or(0),
            url: self.audio_url.clone(),
            cover: self.cover_url.clone(),
            source: self.source.clone(),
            source_id: self.source_id.clone(),
            songmid: self.songmid.clone(),
            hash: self.hash.clone(),
            str_media_mid: self.str_media_mid.clone(),
            copyright_id: self.copyright_id.clone(),
            album_id: self.album_id.clone(),
        }
    }

    pub fn create_input_from_track(track: PlaylistTrackInput) -> CreateSong {
        CreateSong {
            title: track.name,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            cover_url: track.cover,
            audio_url: String::new(),
            source: track.source,
            source_id: track.source_id,
            songmid: track.songmid.or(Some(track.id)),
            hash: track.hash,
            str_media_mid: track.str_media_mid,
            copyright_id: track.copyright_id,
            album_id: track.album_id,
        }
    }
}

impl Song {
    /// Create a new song
    pub async fn create(pool: &SqlitePool, input: CreateSong) -> Result<Self, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query_as::<_, Song>(
            r#"
            INSERT INTO songs (
                title,
                artist,
                album,
                duration,
                cover_url,
                audio_url,
                source,
                source_id,
                songmid,
                hash,
                str_media_mid,
                copyright_id,
                album_id,
                added_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&input.title)
        .bind(&input.artist)
        .bind(&input.album)
        .bind(&input.duration)
        .bind(&input.cover_url)
        .bind(&input.audio_url)
        .bind(&input.source)
        .bind(&input.source_id)
        .bind(&input.songmid)
        .bind(&input.hash)
        .bind(&input.str_media_mid)
        .bind(&input.copyright_id)
        .bind(&input.album_id)
        .bind(&now)
        .fetch_one(pool)
        .await?;

        Ok(result)
    }

    /// Get a song by ID
    pub async fn get_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Self>, sqlx::Error> {
        let result = sqlx::query_as::<_, Song>("SELECT * FROM songs WHERE id = ?")
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
        let result =
            sqlx::query_as::<_, Song>("SELECT * FROM songs WHERE source = ? AND source_id = ?")
                .bind(source)
                .bind(source_id)
                .fetch_optional(pool)
                .await?;

        Ok(result)
    }

    /// Get all songs
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<Self>, sqlx::Error> {
        let results = sqlx::query_as::<_, Song>("SELECT * FROM songs ORDER BY added_at DESC")
            .fetch_all(pool)
            .await?;

        Ok(results)
    }

    /// Insert or update a song by source identity.
    pub async fn upsert(pool: &SqlitePool, input: CreateSong) -> Result<Self, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO songs (
                title,
                artist,
                album,
                duration,
                cover_url,
                audio_url,
                source,
                source_id,
                songmid,
                hash,
                str_media_mid,
                copyright_id,
                album_id,
                added_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source, source_id) DO UPDATE SET
                title = excluded.title,
                artist = excluded.artist,
                album = excluded.album,
                duration = excluded.duration,
                cover_url = COALESCE(excluded.cover_url, songs.cover_url),
                audio_url = CASE
                    WHEN excluded.audio_url = '' THEN songs.audio_url
                    ELSE excluded.audio_url
                END,
                songmid = COALESCE(excluded.songmid, songs.songmid),
                hash = COALESCE(excluded.hash, songs.hash),
                str_media_mid = COALESCE(excluded.str_media_mid, songs.str_media_mid),
                copyright_id = COALESCE(excluded.copyright_id, songs.copyright_id),
                album_id = COALESCE(excluded.album_id, songs.album_id)
            "#,
        )
        .bind(&input.title)
        .bind(&input.artist)
        .bind(&input.album)
        .bind(&input.duration)
        .bind(&input.cover_url)
        .bind(&input.audio_url)
        .bind(&input.source)
        .bind(&input.source_id)
        .bind(&input.songmid)
        .bind(&input.hash)
        .bind(&input.str_media_mid)
        .bind(&input.copyright_id)
        .bind(&input.album_id)
        .bind(&now)
        .execute(pool)
        .await?;

        Song::get_by_source(pool, &input.source, &input.source_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)
    }

    /// Search songs by title or artist
    pub async fn search(pool: &SqlitePool, query: &str) -> Result<Vec<Self>, sqlx::Error> {
        let pattern = format!("%{}%", query);

        let results = sqlx::query_as::<_, Song>(
            r#"
            SELECT * FROM songs
            WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
            ORDER BY added_at DESC
            "#,
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
                audio_url = COALESCE(?, audio_url),
                songmid = COALESCE(?, songmid),
                hash = COALESCE(?, hash),
                str_media_mid = COALESCE(?, str_media_mid),
                copyright_id = COALESCE(?, copyright_id),
                album_id = COALESCE(?, album_id)
            WHERE id = ?
            RETURNING *
            "#,
        )
        .bind(&input.title)
        .bind(&input.artist)
        .bind(&input.album)
        .bind(&input.duration)
        .bind(&input.cover_url)
        .bind(&input.audio_url)
        .bind(&input.songmid)
        .bind(&input.hash)
        .bind(&input.str_media_mid)
        .bind(&input.copyright_id)
        .bind(&input.album_id)
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(result)
    }

    /// Delete a song
    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<bool, sqlx::Error> {
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
            songmid: Some("12345".to_string()),
            hash: None,
            str_media_mid: None,
            copyright_id: None,
            album_id: None,
        };

        let song = Song::create(&pool, input).await.unwrap();
        assert_eq!(song.title, "Test Song");

        // Get the song
        let found = Song::get_by_id(&pool, song.id).await.unwrap();
        assert!(found.is_some());

        // Get by source
        let found = Song::get_by_source(&pool, "netease", "12345")
            .await
            .unwrap();
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
            songmid: None,
            hash: None,
            str_media_mid: None,
            copyright_id: None,
            album_id: None,
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
