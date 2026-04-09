#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as AsyncMutex;

fn startup_log_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Some(base_dir) = std::env::var_os("LOCALAPPDATA").or_else(|| std::env::var_os("APPDATA")) {
            return PathBuf::from(base_dir)
                .join("Jiyu Music")
                .join("logs")
                .join("startup.log");
        }
    }

    std::env::temp_dir()
        .join("jiyu_music")
        .join("logs")
        .join("startup.log")
}

fn write_startup_log(message: &str) {
    let log_path = startup_log_path();
    if let Some(parent) = log_path.parent() {
        let _ = create_dir_all(parent);
    }

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(
            file,
            "[{}] {}",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
            message
        );
    }
}

fn init_startup_logging() {
    let panic_log_path = startup_log_path();
    if let Some(parent) = panic_log_path.parent() {
        let _ = create_dir_all(parent);
    }

    std::panic::set_hook(Box::new(move |panic_info| {
        let location = panic_info
            .location()
            .map(|location| format!("{}:{}", location.file(), location.line()))
            .unwrap_or_else(|| "unknown".to_string());
        let payload = if let Some(message) = panic_info.payload().downcast_ref::<&str>() {
            (*message).to_string()
        } else if let Some(message) = panic_info.payload().downcast_ref::<String>() {
            message.clone()
        } else {
            "panic without string payload".to_string()
        };

        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&panic_log_path) {
            let _ = writeln!(
                file,
                "[{}] panic at {}: {}",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
                location,
                payload
            );
        }
    }));

    write_startup_log("startup logging initialized");
}

fn main() {
    init_startup_logging();
    write_startup_log("starting tauri application");

    // Create database state
    let db_state: Arc<AsyncMutex<Option<jiyu_music::Database>>> = Arc::new(AsyncMutex::new(None));

    // Create lyrics state
    let lyrics_state: Arc<Mutex<jiyu_music::LyricsState>> =
        Arc::new(Mutex::new(jiyu_music::LyricsState::new()));

    // Create player state
    let player = match jiyu_music::Player::new() {
        Ok(player) => {
            write_startup_log("player initialized successfully");
            player
        }
        Err(error) => {
            write_startup_log(&format!("player initialization failed: {}", error));
            eprintln!("Failed to initialize audio player: {}", error);
            return;
        }
    };
    let player_state = Arc::new(AsyncMutex::new(player));

    // QQ auth state, in-memory only for current app run.
    let qq_auth_state: jiyu_music::SharedQqAuthState =
        Arc::new(AsyncMutex::new(jiyu_music::QqAuthState::default()));

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    #[cfg(feature = "dev-tools")]
    let builder = builder.plugin(tauri_plugin_mcp_bridge::init());

    write_startup_log("plugins registered");

    builder
        .manage(db_state)
        .manage(lyrics_state)
        .manage(player_state)
        .manage(qq_auth_state)
        .setup(|app| {
            write_startup_log("entering setup");
            // ── 创建主窗口 ──────────────────────────────────────
            // 需要在代码中创建（而非 tauri.conf.json），以便在 Windows 上
            // 注入 WebView2 浏览器参数，解决 autoplay 策略限制。
            use tauri::{WebviewUrl, WebviewWindowBuilder};

            #[allow(unused_mut)]
            let mut builder =
                WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                    .title("Jiyu Music")
                    .inner_size(1440.0, 1055.0)
                    .min_inner_size(654.0, 479.0)
                    .resizable(true)
                    .accept_first_mouse(true)
                    .decorations(false)
                    .fullscreen(false)
                    .visible(true);

            #[cfg(debug_assertions)]
            {
                builder = builder.devtools(true);
            }

            #[cfg(not(target_os = "windows"))]
            {
                builder = builder.transparent(true).shadow(false);
            }

            #[cfg(target_os = "windows")]
            {
                // Windows/WebView2 对透明无边框窗口更敏感，先以稳定启动为优先。
                builder = builder.transparent(false).shadow(true);
            }

            // Windows: 允许 WebView2 自动播放音频（无需用户手势）
            // 这是音乐应用的必要配置，否则异步 URL 解析后会丢失用户手势上下文
            #[cfg(target_os = "windows")]
            {
                builder =
                    builder.additional_browser_args("--autoplay-policy=no-user-gesture-required");
            }

            builder.build().map_err(|error| {
                write_startup_log(&format!("failed to create main window: {}", error));
                error
            })?;

            write_startup_log("main window created");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            jiyu_music::exit_app,
            jiyu_music::set_network_proxy,
            jiyu_music::ensure_qq_auth_session,
            // Database commands
            jiyu_music::init_database,
            // Playlist commands
            jiyu_music::create_playlist,
            jiyu_music::create_imported_playlist,
            jiyu_music::get_playlists,
            jiyu_music::get_playlist,
            jiyu_music::update_playlist,
            jiyu_music::delete_playlist,
            jiyu_music::add_song_to_playlist,
            jiyu_music::remove_song_from_playlist,
            jiyu_music::get_playlist_songs,
            jiyu_music::get_playlist_overviews,
            // Song commands
            jiyu_music::create_song,
            jiyu_music::get_all_songs,
            jiyu_music::search_local_songs,
            jiyu_music::update_song,
            jiyu_music::delete_song,
            jiyu_music::add_track_to_playlist,
            jiyu_music::remove_tracks_from_playlist,
            jiyu_music::reorder_playlist_songs,
            jiyu_music::sync_imported_playlist,
            // Settings commands
            jiyu_music::get_setting,
            jiyu_music::set_setting,
            jiyu_music::get_all_settings,
            // Search commands
            jiyu_music::search_music_sources,
            jiyu_music::search_all_music_sources,
            jiyu_music::get_song_url,
            jiyu_music::get_lyric,
            jiyu_music::get_source_playlist,
            jiyu_music::search_source_playlists,
            jiyu_music::get_source_playlist_detail,
            jiyu_music::get_available_sources,
            jiyu_music::probe_media_url,
            jiyu_music::cache_media_url,
            jiyu_music::load_cached_media_blob,
            jiyu_music::get_cached_playback,
            jiyu_music::upsert_cached_playback,
            jiyu_music::clear_cached_playback,
            jiyu_music::cache_playback_media,
            jiyu_music::prune_playback_cache,
            jiyu_music::get_playback_cache_stats,
            // Download commands (from download.rs)
            jiyu_music::create_download_task,
            jiyu_music::get_download_tasks,
            jiyu_music::get_download_task,
            jiyu_music::get_download_tasks_by_status,
            jiyu_music::update_download_task,
            jiyu_music::delete_download_task,
            jiyu_music::start_download,
            jiyu_music::pause_download,
            jiyu_music::resume_download,
            jiyu_music::open_download_folder,
            jiyu_music::select_download_folder,
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
            // Effects commands
            jiyu_music::set_equalizer_band,
            jiyu_music::reset_equalizer,
            jiyu_music::set_reverb_mix,
            jiyu_music::set_reverb_preset,
            jiyu_music::set_effect_enabled,
            jiyu_music::get_effect_settings,
            jiyu_music::apply_equalizer_preset,
            jiyu_music::get_equalizer_presets,
            jiyu_music::get_reverb_presets,
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
            jiyu_music::import_theme_baseplate_image,
            jiyu_music::set_theme,
            jiyu_music::reset_theme,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|error| {
            write_startup_log(&format!("error while running tauri application: {}", error));
            panic!("error while running tauri application: {}", error);
        });
}
