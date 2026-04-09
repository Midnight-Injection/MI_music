// Tauri commands for frontend-backend communication
// This module will contain all Tauri commands exposed to the frontend

pub mod app;
pub mod db;
pub mod default_sources;
pub mod download;
pub mod effects;
pub mod lyrics;
pub mod lyrics_window;
pub mod playback_cache;
pub mod player;
pub mod script_runtime;
pub mod search;
pub mod theme;
pub mod user_source;

pub use app::{exit_app, set_network_proxy};
pub use db::{
    add_song_to_playlist, add_track_to_playlist, create_imported_playlist, create_playlist,
    create_song, delete_playlist, delete_song, get_all_settings, get_all_songs, get_playlist,
    get_playlist_overviews, get_playlist_songs, get_playlists, get_setting, init_database,
    remove_song_from_playlist, remove_tracks_from_playlist, reorder_playlist_songs,
    search_local_songs, set_setting, sync_imported_playlist, update_playlist, update_song,
};
pub use default_sources::{
    has_default_sources_been_imported, import_default_sources, list_available_default_sources,
};
pub use download::{
    create_download_task, delete_download_task, get_download_task, get_download_tasks,
    get_download_tasks_by_status, open_download_folder, pause_download, resume_download,
    select_download_folder, start_download, update_download_task,
};
pub use effects::{
    apply_equalizer_preset, get_effect_settings, get_equalizer_presets, get_reverb_presets,
    reset_equalizer, set_effect_enabled, set_equalizer_band, set_reverb_mix, set_reverb_preset,
};
pub use lyrics::{
    get_all_lyrics, get_current_line, get_lyrics_offset, load_lyrics, parse_lyrics, reset_lyrics,
    set_lyrics_offset,
};
pub use lyrics_window::{
    lock_lyrics_window, set_lyrics_always_on_top, set_lyrics_window_position,
    set_lyrics_window_size, toggle_lyrics_window, update_desktop_lyrics,
};
pub use playback_cache::{
    cache_playback_media, clear_cached_playback, get_cached_playback, get_playback_cache_stats,
    prune_playback_cache, upsert_cached_playback,
};
pub use player::{
    add_to_queue, clear_queue, get_player_state, get_queue, pause_music, play_music, play_next,
    play_previous, play_song_by_id, remove_from_queue, resume_music, seek_to, set_loop_mode,
    set_playback_rate, set_queue, set_volume, stop_music, toggle_mute,
};
pub use script_runtime::script_http_request;
pub use search::{
    cache_media_url, get_available_sources, get_lyric, get_song_url, get_source_playlist,
    get_source_playlist_detail, load_cached_media_blob, probe_media_url, search_all_music_sources,
    search_music_sources, search_source_playlists,
};
pub use theme::{get_theme, import_theme_baseplate_image, reset_theme, set_theme};
pub use user_source::{
    delete_user_source, export_user_source, get_user_source, get_user_sources,
    import_user_source_from_file, update_user_source,
};
