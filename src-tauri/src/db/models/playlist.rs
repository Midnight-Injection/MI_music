use crate::db::models::song::{PlaylistTrackInput, Song, StoredTrack};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub system_key: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistSummary {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub system_key: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub music_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTrackResult {
    pub track: StoredTrack,
    pub added: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePlaylist {
    pub name: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub system_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePlaylist {
    pub name: Option<String>,
    pub description: Option<String>,
    pub cover_url: Option<String>,
}

impl Playlist {
    pub async fn ensure_defaults(pool: &SqlitePool) -> Result<(), sqlx::Error> {
        Self::ensure_builtin(pool, "default", "试听列表").await?;
        Self::ensure_builtin(pool, "love", "我的收藏").await?;
        Ok(())
    }

    async fn ensure_builtin(
        pool: &SqlitePool,
        system_key: &str,
        name: &str,
    ) -> Result<(), sqlx::Error> {
        if sqlx::query_scalar::<_, i64>("SELECT COUNT(1) FROM playlists WHERE system_key = ?")
            .bind(system_key)
            .fetch_one(pool)
            .await?
            > 0
        {
            return Ok(());
        }

        let now = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            r#"
            INSERT INTO playlists (name, description, cover_url, system_key, created_at, updated_at)
            VALUES (?, NULL, NULL, ?, ?, ?)
            "#,
        )
        .bind(name)
        .bind(system_key)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Create a new playlist
    pub async fn create(pool: &SqlitePool, input: CreatePlaylist) -> Result<Self, sqlx::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        let result = sqlx::query_as::<_, Playlist>(
            r#"
            INSERT INTO playlists (name, description, cover_url, system_key, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&input.name)
        .bind(&input.description)
        .bind(&input.cover_url)
        .bind(&input.system_key)
        .bind(&now)
        .bind(&now)
        .fetch_one(pool)
        .await?;

        Ok(result)
    }

    /// Get a playlist by ID
    pub async fn get_by_id(pool: &SqlitePool, id: i64) -> Result<Option<Self>, sqlx::Error> {
        let result = sqlx::query_as::<_, Playlist>("SELECT * FROM playlists WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;

        Ok(result)
    }

    /// Get all playlists
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<Self>, sqlx::Error> {
        let results = sqlx::query_as::<_, Playlist>(
            "SELECT * FROM playlists ORDER BY CASE system_key WHEN 'default' THEN 0 WHEN 'love' THEN 1 ELSE 2 END, created_at DESC"
        )
        .fetch_all(pool)
        .await?;

        Ok(results)
    }

    pub async fn get_overviews(pool: &SqlitePool) -> Result<Vec<PlaylistSummary>, sqlx::Error> {
        let results = sqlx::query_as::<_, PlaylistSummary>(
            r#"
            SELECT
                p.id,
                p.name,
                p.description,
                p.cover_url,
                p.system_key,
                p.created_at,
                p.updated_at,
                COUNT(ps.song_id) AS music_count
            FROM playlists p
            LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
            GROUP BY p.id
            ORDER BY CASE p.system_key WHEN 'default' THEN 0 WHEN 'love' THEN 1 ELSE 2 END, p.created_at DESC
            "#
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
            "#,
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
    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM playlists WHERE id = ? AND system_key IS NULL")
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
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_songs WHERE playlist_id = ?))"
        )
        .bind(playlist_id)
        .bind(song_id)
        .bind(playlist_id)
        .execute(pool)
        .await?;

        let added = result.rows_affected() > 0;

        if added {
            sqlx::query("UPDATE playlists SET updated_at = ? WHERE id = ?")
                .bind(chrono::Utc::now().to_rfc3339())
                .bind(playlist_id)
                .execute(pool)
                .await?;
        }

        Ok(added)
    }

    /// Remove a song from a playlist
    pub async fn remove_song(
        pool: &SqlitePool,
        playlist_id: i64,
        song_id: i64,
    ) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?")
                .bind(playlist_id)
                .bind(song_id)
                .execute(pool)
                .await?;

        if result.rows_affected() > 0 {
            sqlx::query("UPDATE playlists SET updated_at = ? WHERE id = ?")
                .bind(chrono::Utc::now().to_rfc3339())
                .bind(playlist_id)
                .execute(pool)
                .await?;
        }

        Ok(result.rows_affected() > 0)
    }

    pub async fn remove_songs(
        pool: &SqlitePool,
        playlist_id: i64,
        song_ids: &[i64],
    ) -> Result<(), sqlx::Error> {
        if song_ids.is_empty() {
            return Ok(());
        }

        let mut query = String::from("DELETE FROM playlist_songs WHERE playlist_id = ?");
        query.push_str(" AND song_id IN (");
        query.push_str(&vec!["?"; song_ids.len()].join(", "));
        query.push(')');

        let mut db_query = sqlx::query(&query).bind(playlist_id);
        for song_id in song_ids {
            db_query = db_query.bind(song_id);
        }

        db_query.execute(pool).await?;

        sqlx::query("UPDATE playlists SET updated_at = ? WHERE id = ?")
            .bind(chrono::Utc::now().to_rfc3339())
            .bind(playlist_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn reorder_songs(
        pool: &SqlitePool,
        playlist_id: i64,
        song_ids: &[i64],
    ) -> Result<(), sqlx::Error> {
        let mut tx = pool.begin().await?;

        for (index, song_id) in song_ids.iter().enumerate() {
            sqlx::query(
                "UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND song_id = ?",
            )
            .bind((index + 1) as i64)
            .bind(playlist_id)
            .bind(song_id)
            .execute(&mut *tx)
            .await?;
        }

        sqlx::query("UPDATE playlists SET updated_at = ? WHERE id = ?")
            .bind(chrono::Utc::now().to_rfc3339())
            .bind(playlist_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    /// Get all songs in a playlist
    pub async fn get_songs(pool: &SqlitePool, playlist_id: i64) -> Result<Vec<Song>, sqlx::Error> {
        let songs = sqlx::query_as::<_, Song>(
            r#"
            SELECT s.* FROM songs s
            INNER JOIN playlist_songs ps ON s.id = ps.song_id
            WHERE ps.playlist_id = ?
            ORDER BY ps.position
            "#,
        )
        .bind(playlist_id)
        .fetch_all(pool)
        .await?;

        Ok(songs)
    }

    pub async fn get_tracks(
        pool: &SqlitePool,
        playlist_id: i64,
    ) -> Result<Vec<StoredTrack>, sqlx::Error> {
        let songs = Self::get_songs(pool, playlist_id).await?;
        Ok(songs
            .into_iter()
            .map(|song| song.to_stored_track())
            .collect())
    }

    pub async fn add_track(
        pool: &SqlitePool,
        playlist_id: i64,
        track: PlaylistTrackInput,
    ) -> Result<AddTrackResult, sqlx::Error> {
        let song = Song::upsert(pool, Song::create_input_from_track(track)).await?;
        let added = Self::add_song(pool, playlist_id, song.id).await?;
        Ok(AddTrackResult {
            track: song.to_stored_track(),
            added,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

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
            system_key: None,
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

    #[tokio::test]
    async fn test_add_track_persists_to_sqlite_playlist() {
        let db_path = std::env::temp_dir().join(format!(
            "jiyu-music-playlist-{}-{}.db",
            std::process::id(),
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or_default(),
        ));

        let db = Database::new(db_path.to_str().unwrap()).await.unwrap();
        db.migrate().await.unwrap();
        Playlist::ensure_defaults(db.pool()).await.unwrap();

        let default_playlist = Playlist::get_all(db.pool())
            .await
            .unwrap()
            .into_iter()
            .find(|playlist| playlist.system_key.as_deref() == Some("default"))
            .unwrap();

        let result = Playlist::add_track(
            db.pool(),
            default_playlist.id,
            PlaylistTrackInput {
                id: "kw_song_1".to_string(),
                name: "测试歌曲".to_string(),
                artist: "测试歌手".to_string(),
                album: Some("测试专辑".to_string()),
                duration: Some(200),
                cover: None,
                source: "kw".to_string(),
                source_id: "songmid_1".to_string(),
                songmid: Some("songmid_1".to_string()),
                hash: None,
                str_media_mid: None,
                copyright_id: None,
                album_id: None,
            },
        )
        .await
        .unwrap();

        assert!(result.added);
        assert_eq!(result.track.name, "测试歌曲");

        let tracks = Playlist::get_tracks(db.pool(), default_playlist.id)
            .await
            .unwrap();
        assert_eq!(tracks.len(), 1);
        assert_eq!(tracks[0].name, "测试歌曲");
        assert_eq!(tracks[0].source, "kw");
        assert_eq!(tracks[0].source_id, "songmid_1");

        let duplicate = Playlist::add_track(
            db.pool(),
            default_playlist.id,
            PlaylistTrackInput {
                id: "kw_song_1".to_string(),
                name: "测试歌曲".to_string(),
                artist: "测试歌手".to_string(),
                album: Some("测试专辑".to_string()),
                duration: Some(200),
                cover: None,
                source: "kw".to_string(),
                source_id: "songmid_1".to_string(),
                songmid: Some("songmid_1".to_string()),
                hash: None,
                str_media_mid: None,
                copyright_id: None,
                album_id: None,
            },
        )
        .await
        .unwrap();

        assert!(!duplicate.added);
        assert_eq!(
            Playlist::get_tracks(db.pool(), default_playlist.id)
                .await
                .unwrap()
                .len(),
            1
        );

        db.close().await;
        let _ = std::fs::remove_file(db_path);
    }
}
