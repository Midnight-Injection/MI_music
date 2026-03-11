use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use serde::{Deserialize, Serialize};

/// Lyrics window state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricsWindowState {
    pub is_visible: bool,
    pub is_locked: bool,
    pub is_always_on_top: bool,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl Default for LyricsWindowState {
    fn default() -> Self {
        Self {
            is_visible: false,
            is_locked: false,
            is_always_on_top: true,
            x: 100,
            y: 100,
            width: 600,
            height: 120,
        }
    }
}

/// Get or create the lyrics window
pub fn get_lyrics_window(app: &AppHandle) -> tauri::Result<tauri::WebviewWindow> {
    if let Some(window) = app.get_webview_window("lyrics") {
        return Ok(window);
    }

    create_lyrics_window(app)
}

/// Create a new lyrics window
pub fn create_lyrics_window(app: &AppHandle) -> tauri::Result<tauri::WebviewWindow> {
    WebviewWindowBuilder::new(
        app,
        "lyrics",
        WebviewUrl::App("lyrics-window.html".into())
    )
    .title("Desktop Lyrics")
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .center()
    .inner_size(600.0, 120.0)
    .resizable(true)
    .build()
}

/// Toggle lyrics window visibility
pub fn toggle_lyrics_window(app: AppHandle) -> tauri::Result<bool> {
    let window = get_lyrics_window(&app)?;

    if window.is_visible()? {
        window.hide()?;
        Ok(false)
    } else {
        window.show()?;
        window.set_focus()?;
        Ok(true)
    }
}

/// Set lyrics window position
pub fn set_lyrics_window_position(app: AppHandle, x: i32, y: i32) -> tauri::Result<()> {
    let window = get_lyrics_window(&app)?;
    window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))?;
    Ok(())
}

/// Set lyrics window size
pub fn set_lyrics_window_size(app: AppHandle, width: u32, height: u32) -> tauri::Result<()> {
    let window = get_lyrics_window(&app)?;
    window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width, height }))?;
    Ok(())
}

/// Set always on top
pub fn set_lyrics_always_on_top(app: AppHandle, enabled: bool) -> tauri::Result<()> {
    let window = get_lyrics_window(&app)?;
    window.set_always_on_top(enabled)?;
    Ok(())
}

/// Lock/unlock lyrics window (prevent dragging)
pub fn lock_lyrics_window(app: AppHandle, locked: bool) -> tauri::Result<()> {
    let window = get_lyrics_window(&app)?;

    if locked {
        window.set_ignore_cursor_events(true)?;
    } else {
        window.set_ignore_cursor_events(false)?;
    }

    Ok(())
}

/// Send lyrics update to the window
pub fn update_lyrics(app: AppHandle, lyrics: &str) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("lyrics") {
        window.emit("lyrics-update", lyrics)?;
    }
    Ok(())
}

/// Check if any window is in fullscreen (to hide desktop lyrics)
pub fn is_any_fullscreen(app: &AppHandle) -> bool {
    app.webview_windows()
        .values()
        .filter(|w| w.label() != "lyrics")
        .any(|w| {
            w.current_monitor()
                .ok()
                .and_then(|m| m.map(|_m| w.is_fullscreen().unwrap_or(false)))
                .unwrap_or(false)
        })
}
