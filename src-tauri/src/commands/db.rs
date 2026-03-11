use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::db::{Database, get_pool};
use crate::db::models::*;

/// Database state shared across Tauri commands
pub type DbState = Arc<Mutex<Option<Database>>>;

/// Initialize the database
#[tauri::command]
pub async fn init_database(
    db_state: State<'_, DbState>,
    app_path: String,
) -> Result<(), String> {
    let db_path = format!("{}/jiyu_music.db", app_path);

    match Database::new(&db_path).await {
        Ok(db) => {
            // Run migrations
            if let Err(e) = db.migrate().await {
                return Err(format!("Migration failed: {}", e));
            }

            // Set global pool for other modules
            db.set_global_pool()
                .map_err(|e| format!("Failed to set global pool: {}", e))?;

            // Store the database in state
            let mut guard = db_state.lock().await;
            *guard = Some(db);

            Ok(())
        }
        Err(e) => Err(format!("Failed to initialize database: {}", e))
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
    };

    Playlist::create(db.pool(), input)
        .await
        .map_err(|e| e.to_string())
}

/// Get all playlists
#[tauri::command]
pub async fn get_playlists(
    db_state: State<'_, DbState>,
) -> Result<Vec<Playlist>, String> {
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
    };

    Playlist::update(db.pool(), id, input)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a playlist
#[tauri::command]
pub async fn delete_playlist(
    db_state: State<'_, DbState>,
    id: i64,
) -> Result<bool, String> {
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
) -> Result<Vec<Song>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Playlist::get_songs(db.pool(), playlist_id)
        .await
        .map_err(|e| e.to_string())
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
    };

    Song::create(db.pool(), input)
        .await
        .map_err(|e| e.to_string())
}

/// Get all songs
#[tauri::command]
pub async fn get_all_songs(
    db_state: State<'_, DbState>,
) -> Result<Vec<Song>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Song::get_all(db.pool())
        .await
        .map_err(|e| e.to_string())
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
    };

    Song::update(db.pool(), id, input)
        .await
        .map_err(|e| e.to_string())
}

/// Delete a song
#[tauri::command]
pub async fn delete_song(
    db_state: State<'_, DbState>,
    id: i64,
) -> Result<bool, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Song::delete(db.pool(), id)
        .await
        .map_err(|e| e.to_string())
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

    let input = UpsertSetting {
        key,
        value,
    };

    Setting::set(db.pool(), input)
        .await
        .map_err(|e| e.to_string())
}

/// Get all settings
#[tauri::command]
pub async fn get_all_settings(
    db_state: State<'_, DbState>,
) -> Result<Vec<Setting>, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;

    Setting::get_all(db.pool())
        .await
        .map_err(|e| e.to_string())
}

// Download task database commands (conflicting with download.rs removed)
// The download.rs module already has these commands implemented
