use crate::db::models::playlist::{
    AddTrackResult, CreatePlaylist, ImportPlaylistResult, Playlist, PlaylistSummary, UpdatePlaylist,
};
use crate::db::models::settings::{Setting, UpsertSetting};
use crate::db::models::song::{CreateSong, PlaylistTrackInput, Song, StoredTrack, UpdateSong};
use crate::db::Database;
use std::path::Path;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

/// Database state shared across Tauri commands
pub type DbState = Arc<Mutex<Option<Database>>>;

async fn initialize_database_internal(db_state: &DbState, app_path: &str) -> Result<(), String> {
    {
        let guard = db_state.lock().await;
        if guard.is_some() {
            return Ok(());
        }
    }

    std::fs::create_dir_all(Path::new(app_path))
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    let db_path = format!("{}/jiyu_music.db", app_path);

    let db = Database::new(&db_path)
        .await
        .map_err(|e| format!("Failed to initialize database: {}", e))?;

    db.migrate()
        .await
        .map_err(|e| format!("Migration failed: {}", e))?;

    db.ensure_global_pool()
        .map_err(|e| format!("Failed to set global pool: {}", e))?;

    let mut guard = db_state.lock().await;
    if guard.is_some() {
        return Ok(());
    }

    *guard = Some(db);

    if let Some(db) = guard.as_ref() {
        Playlist::ensure_defaults(db.pool())
            .await
            .map_err(|e| format!("Failed to initialize default playlists: {}", e))?;
    }

    Ok(())
}

/// Initialize the database
#[tauri::command]
pub async fn init_database(db_state: State<'_, DbState>, app_path: String) -> Result<(), String> {
    initialize_database_internal(db_state.inner(), &app_path).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn create_test_app_dir() -> String {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("jiyu_music_init_test_{unique_suffix}"));
        dir.to_string_lossy().to_string()
    }

    #[tokio::test]
    async fn init_database_is_idempotent_for_same_process() {
        let db_state: DbState = Arc::new(Mutex::new(None));
        let app_dir = create_test_app_dir();

        initialize_database_internal(&db_state, &app_dir)
            .await
            .expect("first init should succeed");
        initialize_database_internal(&db_state, &app_dir)
            .await
            .expect("second init should succeed");

        let guard = db_state.lock().await;
        assert!(guard.is_some(), "database state should remain initialized");

        drop(guard);
        let _ = std::fs::remove_dir_all(&app_dir);
    }
}

// Playlist commands

/// Create a new playlist
#[tauri::command]
pub async fn create_playlist(
    db_state: State<'_, DbState>,
    name: String,
    description: Option<String>,
    cover_url: Option<String>,
) -> Result<Playlist, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    let input = CreatePlaylist {
        name,
        description,
        cover_url,
        system_key: None,
        import_source: None,
        import_source_playlist_id: None,
        import_source_playlist_url: None,
        last_synced_at: None,
    };

    Playlist::create(db.pool(), input)
        .await
        .map_err(|e| e.to_string())
}

/// Get all playlists
#[tauri::command]
pub async fn get_playlists(db_state: State<'_, DbState>) -> Result<Vec<Playlist>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::get_all(db.pool())
        .await
        .map_err(|e| e.to_string())
}

/// Get a playlist by ID
#[tauri::command]
pub async fn get_playlist(
    db_state: State<'_, DbState>,
    id: i64,
) -> Result<Option<Playlist>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::get_by_id(db.pool(), id)
        .await
        .map_err(|e| e.to_string())
}

/// Update a playlist
#[tauri::command]
pub async fn update_playlist(
    db_state: State<'_, DbState>,
    id: i64,
    name: Option<String>,
    description: Option<String>,
    cover_url: Option<String>,
) -> Result<Option<Playlist>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    let input = UpdatePlaylist {
        name,
        description,
        cover_url,
        import_source_playlist_url: None,
        last_synced_at: None,
    };

    Playlist::update(db.pool(), id, input)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a playlist
#[tauri::command]
pub async fn delete_playlist(db_state: State<'_, DbState>, id: i64) -> Result<bool, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::delete(db.pool(), id)
        .await
        .map_err(|e| e.to_string())
}

/// Add a song to a playlist
#[tauri::command]
pub async fn add_song_to_playlist(
    db_state: State<'_, DbState>,
    playlist_id: i64,
    song_id: i64,
) -> Result<(), String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::add_song(db.pool(), playlist_id, song_id)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Remove a song from a playlist
#[tauri::command]
pub async fn remove_song_from_playlist(
    db_state: State<'_, DbState>,
    playlist_id: i64,
    song_id: i64,
) -> Result<bool, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::remove_song(db.pool(), playlist_id, song_id)
        .await
        .map_err(|e| e.to_string())
}

/// Get all songs in a playlist
#[tauri::command]
pub async fn get_playlist_songs(
    db_state: State<'_, DbState>,
    playlist_id: i64,
) -> Result<Vec<StoredTrack>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::get_tracks(db.pool(), playlist_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_playlist_overviews(
    db_state: State<'_, DbState>,
) -> Result<Vec<PlaylistSummary>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::get_overviews(db.pool())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_track_to_playlist(
    db_state: State<'_, DbState>,
    playlist_id: i64,
    track: PlaylistTrackInput,
) -> Result<AddTrackResult, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::add_track(db.pool(), playlist_id, track)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_tracks_from_playlist(
    db_state: State<'_, DbState>,
    playlist_id: i64,
    song_ids: Vec<i64>,
) -> Result<(), String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::remove_songs(db.pool(), playlist_id, &song_ids)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn reorder_playlist_songs(
    db_state: State<'_, DbState>,
    playlist_id: i64,
    song_ids: Vec<i64>,
) -> Result<(), String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::reorder_songs(db.pool(), playlist_id, &song_ids)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_imported_playlist(
    db_state: State<'_, DbState>,
    name: String,
    description: Option<String>,
    cover_url: Option<String>,
    import_source: String,
    import_source_playlist_id: String,
    import_source_playlist_url: Option<String>,
    tracks: Vec<PlaylistTrackInput>,
) -> Result<ImportPlaylistResult, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    let now = chrono::Utc::now().to_rfc3339();

    let (playlist, created) = if let Some(existing) =
        Playlist::get_by_import_source(db.pool(), &import_source, &import_source_playlist_id)
            .await
            .map_err(|e| e.to_string())?
    {
        let updated = Playlist::update(
            db.pool(),
            existing.id,
            UpdatePlaylist {
                name: Some(name),
                description,
                cover_url,
                import_source_playlist_url,
                last_synced_at: Some(now.clone()),
            },
        )
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Imported playlist not found after update")?;

        (updated, false)
    } else {
        let created = Playlist::create(
            db.pool(),
            CreatePlaylist {
                name,
                description,
                cover_url,
                system_key: None,
                import_source: Some(import_source),
                import_source_playlist_id: Some(import_source_playlist_id),
                import_source_playlist_url,
                last_synced_at: Some(now.clone()),
            },
        )
        .await
        .map_err(|e| e.to_string())?;

        (created, true)
    };

    Playlist::replace_tracks(db.pool(), playlist.id, tracks)
        .await
        .map_err(|e| e.to_string())?;

    let refreshed = Playlist::get_by_id(db.pool(), playlist.id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Imported playlist not found after save")?;

    Ok(ImportPlaylistResult {
        playlist: refreshed,
        created,
    })
}

#[tauri::command]
pub async fn sync_imported_playlist(
    db_state: State<'_, DbState>,
    playlist_id: i64,
    name: Option<String>,
    description: Option<String>,
    cover_url: Option<String>,
    import_source_playlist_url: Option<String>,
    tracks: Vec<PlaylistTrackInput>,
) -> Result<Playlist, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    let existing = Playlist::get_by_id(db.pool(), playlist_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Playlist not found")?;

    if existing.import_source.is_none() || existing.import_source_playlist_id.is_none() {
        return Err("当前歌单不是可同步的导入歌单".to_string());
    }

    Playlist::update(
        db.pool(),
        playlist_id,
        UpdatePlaylist {
            name,
            description,
            cover_url,
            import_source_playlist_url,
            last_synced_at: Some(chrono::Utc::now().to_rfc3339()),
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    Playlist::replace_tracks(db.pool(), playlist_id, tracks)
        .await
        .map_err(|e| e.to_string())?;

    Playlist::get_by_id(db.pool(), playlist_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Playlist not found after sync".to_string())
}

// Song commands

/// Create a new song
#[tauri::command]
pub async fn create_song(
    db_state: State<'_, DbState>,
    title: String,
    artist: String,
    album: Option<String>,
    duration: Option<i64>,
    cover_url: Option<String>,
    audio_url: String,
    source: String,
    source_id: String,
) -> Result<Song, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    let input = CreateSong {
        title,
        artist,
        album,
        duration,
        cover_url,
        audio_url,
        source,
        source_id,
        songmid: None,
        hash: None,
        str_media_mid: None,
        copyright_id: None,
        album_id: None,
    };

    Song::create(db.pool(), input)
        .await
        .map_err(|e| e.to_string())
}

/// Get all songs
#[tauri::command]
pub async fn get_all_songs(db_state: State<'_, DbState>) -> Result<Vec<Song>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Song::get_all(db.pool()).await.map_err(|e| e.to_string())
}

/// Search songs in local database
#[tauri::command]
pub async fn search_local_songs(
    db_state: State<'_, DbState>,
    query: String,
) -> Result<Vec<Song>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Song::search(db.pool(), &query)
        .await
        .map_err(|e| e.to_string())
}

/// Update a song
#[tauri::command]
pub async fn update_song(
    db_state: State<'_, DbState>,
    id: i64,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    duration: Option<i64>,
    cover_url: Option<String>,
    audio_url: Option<String>,
) -> Result<Option<Song>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    let input = UpdateSong {
        title,
        artist,
        album,
        duration,
        cover_url,
        audio_url,
        songmid: None,
        hash: None,
        str_media_mid: None,
        copyright_id: None,
        album_id: None,
    };

    Song::update(db.pool(), id, input)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a song
#[tauri::command]
pub async fn delete_song(db_state: State<'_, DbState>, id: i64) -> Result<bool, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Song::delete(db.pool(), id).await.map_err(|e| e.to_string())
}

// Settings commands

/// Get a setting value
#[tauri::command]
pub async fn get_setting(
    db_state: State<'_, DbState>,
    key: String,
) -> Result<Option<Setting>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Setting::get(db.pool(), &key)
        .await
        .map_err(|e| e.to_string())
}

/// Set a setting value
#[tauri::command]
pub async fn set_setting(
    db_state: State<'_, DbState>,
    key: String,
    value: String,
) -> Result<Setting, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    let input = UpsertSetting { key, value };

    Setting::set(db.pool(), input)
        .await
        .map_err(|e| e.to_string())
}

/// Get all settings
#[tauri::command]
pub async fn get_all_settings(db_state: State<'_, DbState>) -> Result<Vec<Setting>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Setting::get_all(db.pool()).await.map_err(|e| e.to_string())
}

// Download task database commands (conflicting with download.rs removed)
// The download.rs module already has these commands implemented
