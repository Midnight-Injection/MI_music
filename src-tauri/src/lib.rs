// Tauri commands and utilities
mod api;
mod commands;
mod db;
mod download;
mod effects;
pub mod lyrics;
pub mod lyrics_window;
mod player;
mod qq_auth;
pub mod script_runtime;
pub mod types;
mod utils;

pub use commands::lyrics::LyricsState;
pub use commands::{
    add_song_to_playlist, add_to_queue, add_track_to_playlist, apply_equalizer_preset,
    cache_media_url, clear_queue, create_download_task, create_imported_playlist, create_playlist,
    create_song, delete_download_task, delete_playlist, delete_song, delete_user_source, exit_app,
    export_user_source, get_all_lyrics, get_all_settings, get_all_songs, get_available_sources,
    get_current_line, get_download_task, get_download_tasks, get_download_tasks_by_status,
    get_effect_settings, get_equalizer_presets, get_lyric, get_lyrics_offset, get_player_state,
    get_playlist, get_playlist_overviews, get_playlist_songs, get_playlists, get_queue,
    get_reverb_presets, get_setting, get_song_url, get_source_playlist, get_source_playlist_detail,
    get_theme, get_user_source, get_user_sources, has_default_sources_been_imported,
    import_default_sources, import_user_source_from_file, init_database,
    list_available_default_sources, load_cached_media_blob, load_lyrics, lock_lyrics_window,
    open_download_folder, parse_lyrics, pause_download, pause_music, play_music, play_next,
    play_previous, play_song_by_id, probe_media_url, remove_from_queue, remove_song_from_playlist,
    remove_tracks_from_playlist, reorder_playlist_songs, reset_equalizer, reset_lyrics,
    reset_theme, resume_download, resume_music, script_http_request, search_all_music_sources,
    search_local_songs, search_music_sources, search_source_playlists, seek_to,
    select_download_folder, set_effect_enabled, set_equalizer_band, set_loop_mode,
    set_lyrics_always_on_top, set_lyrics_offset, set_lyrics_window_position,
    set_lyrics_window_size, set_network_proxy, set_playback_rate, set_queue, set_reverb_mix,
    set_reverb_preset, set_setting, set_theme, set_volume, start_download, stop_music,
    sync_imported_playlist, toggle_lyrics_window, toggle_mute, update_desktop_lyrics,
    update_download_task, update_playlist, update_song, update_user_source,
};
pub use db::Database;
pub use player::Player;
pub use qq_auth::{ensure_qq_auth_session, QqAuthState, SharedQqAuthState};
