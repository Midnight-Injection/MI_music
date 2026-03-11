#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as AsyncMutex;

fn main() {
    // Create database state
    let db_state: Arc<AsyncMutex<Option<jiyu_music::Database>>> = Arc::new(AsyncMutex::new(None));

    // Create lyrics state
    let lyrics_state: Arc<Mutex<jiyu_music::LyricsState>> =
        Arc::new(Mutex::new(jiyu_music::LyricsState::new()));

    // Create player state
    let player = jiyu_music::Player::new()
        .expect("Failed to initialize audio player");
    let player_state = Arc::new(AsyncMutex::new(player));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_mcp_bridge::init())
        .manage(db_state)
        .manage(lyrics_state)
        .manage(player_state)
        .invoke_handler(tauri::generate_handler![
            // Database commands
            jiyu_music::init_database,
            // Playlist commands
            jiyu_music::create_playlist,
            jiyu_music::get_playlists,
            jiyu_music::get_playlist,
            jiyu_music::update_playlist,
            jiyu_music::delete_playlist,
            jiyu_music::add_song_to_playlist,
            jiyu_music::remove_song_from_playlist,
            jiyu_music::get_playlist_songs,
            // Song commands
            jiyu_music::create_song,
            jiyu_music::get_all_songs,
            jiyu_music::search_local_songs,
            jiyu_music::update_song,
            jiyu_music::delete_song,
            // Settings commands
            jiyu_music::get_setting,
            jiyu_music::set_setting,
            jiyu_music::get_all_settings,
            // Search commands
            jiyu_music::search_music_sources,
            jiyu_music::get_song_url,
            jiyu_music::get_lyric,
            jiyu_music::get_source_playlist,
            jiyu_music::get_available_sources,
            // Download commands (from download.rs)
            jiyu_music::create_download_task,
            jiyu_music::get_download_tasks,
            jiyu_music::get_download_task,
            jiyu_music::update_download_task,
            jiyu_music::delete_download_task,
            jiyu_music::start_download,
            jiyu_music::pause_download,
            jiyu_music::resume_download,
            jiyu_music::open_download_folder,
            // Lyrics window commands
            jiyu_music::toggle_lyrics_window,
            jiyu_music::set_lyrics_window_position,
            jiyu_music::set_lyrics_window_size,
            jiyu_music::set_lyrics_always_on_top,
            jiyu_music::lock_lyrics_window,
            jiyu_music::update_desktop_lyrics,
            // Lyrics commands
            jiyu_music::parse_lyrics,
            jiyu_music::get_current_line,
            jiyu_music::load_lyrics,
            jiyu_music::set_lyrics_offset,
            jiyu_music::get_lyrics_offset,
            jiyu_music::reset_lyrics,
            jiyu_music::get_all_lyrics,
            // Player commands
            jiyu_music::play_music,
            jiyu_music::play_song_by_id,
            jiyu_music::pause_music,
            jiyu_music::resume_music,
            jiyu_music::stop_music,
            jiyu_music::seek_to,
            jiyu_music::set_volume,
            jiyu_music::set_playback_rate,
            jiyu_music::get_player_state,
            jiyu_music::play_next,
            jiyu_music::play_previous,
            jiyu_music::set_queue,
            jiyu_music::add_to_queue,
            jiyu_music::remove_from_queue,
            jiyu_music::clear_queue,
            jiyu_music::get_queue,
            jiyu_music::set_loop_mode,
            jiyu_music::toggle_mute,
            // User source commands
            jiyu_music::import_user_source_from_file,
            jiyu_music::get_user_sources,
            jiyu_music::get_user_source,
            jiyu_music::update_user_source,
            jiyu_music::delete_user_source,
            jiyu_music::export_user_source,
            // Default sources commands
            jiyu_music::import_default_sources,
            jiyu_music::has_default_sources_been_imported,
            jiyu_music::list_available_default_sources,
            jiyu_music::script_http_request,
            // Theme commands
            jiyu_music::get_theme,
            jiyu_music::set_theme,
            jiyu_music::reset_theme,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
