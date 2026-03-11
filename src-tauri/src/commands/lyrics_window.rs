use crate::lyrics_window::*;
use tauri::AppHandle;

/// Toggle the lyrics window visibility
#[tauri::command]
pub async fn toggle_lyrics_window(app: AppHandle) -> Result<bool, String> {
    crate::lyrics_window::toggle_lyrics_window(app)
        .map_err(|e| e.to_string())
}

/// Set lyrics window position
#[tauri::command]
pub async fn set_lyrics_window_position(app: AppHandle, x: i32, y: i32) -> Result<(), String> {
    crate::lyrics_window::set_lyrics_window_position(app, x, y)
        .map_err(|e| e.to_string())
}

/// Set lyrics window size
#[tauri::command]
pub async fn set_lyrics_window_size(app: AppHandle, width: u32, height: u32) -> Result<(), String> {
    crate::lyrics_window::set_lyrics_window_size(app, width, height)
        .map_err(|e| e.to_string())
}

/// Set always on top
#[tauri::command]
pub async fn set_lyrics_always_on_top(app: AppHandle, enabled: bool) -> Result<(), String> {
    crate::lyrics_window::set_lyrics_always_on_top(app, enabled)
        .map_err(|e| e.to_string())
}

/// Lock/unlock lyrics window
#[tauri::command]
pub async fn lock_lyrics_window(app: AppHandle, locked: bool) -> Result<(), String> {
    crate::lyrics_window::lock_lyrics_window(app, locked)
        .map_err(|e| e.to_string())
}

/// Update lyrics in the desktop lyrics window
#[tauri::command]
pub async fn update_desktop_lyrics(app: AppHandle, lyrics: String) -> Result<(), String> {
    crate::lyrics_window::update_lyrics(app, &lyrics)
        .map_err(|e| e.to_string())
}
