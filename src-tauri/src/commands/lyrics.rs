use crate::lyrics::{parser::parse_lrc, sync::LyricsSync, Lyrics};
use std::sync::Mutex;
use tauri::State;

/// Global lyrics sync state
pub struct LyricsState {
    sync: Option<LyricsSync>,
}

impl LyricsState {
    pub fn new() -> Self {
        Self { sync: None }
    }
}

/// Parse LRC lyrics content
#[tauri::command]
pub fn parse_lyrics(lrc_content: String) -> Result<Lyrics, String> {
    parse_lrc(&lrc_content).map_err(|e| e.to_string())
}

/// Get current line at given time
#[tauri::command]
pub fn get_current_line(
    time_ms: u64,
    state: State<Mutex<LyricsState>>,
) -> Result<CurrentLineInfo, String> {
    let mut state_guard = state.lock().map_err(|e| e.to_string())?;
    let sync = state_guard
        .sync
        .as_mut()
        .ok_or("No lyrics loaded".to_string())?;

    let update = sync.update(time_ms);

    Ok(CurrentLineInfo {
        current_index: update.current_index,
        current_line: update.current_line,
        prev_line: update.prev_line,
        next_line: update.next_line,
        line_changed: update.line_changed,
        progress_to_next: sync.progress_to_next(time_ms),
        has_word_level: sync.has_word_level(),
    })
}

/// Load lyrics for current track
#[tauri::command]
pub fn load_lyrics(
    lrc_content: String,
    state: State<Mutex<LyricsState>>,
) -> Result<(), String> {
    let lyrics = parse_lrc(&lrc_content).map_err(|e| e.to_string())?;

    let mut state_guard = state.lock().map_err(|e| e.to_string())?;
    state_guard.sync = Some(LyricsSync::new(lyrics));

    Ok(())
}

/// Set lyrics offset in milliseconds
#[tauri::command]
pub fn set_lyrics_offset(
    offset_ms: i64,
    state: State<Mutex<LyricsState>>,
) -> Result<(), String> {
    let mut state_guard = state.lock().map_err(|e| e.to_string())?;
    let sync = state_guard
        .sync
        .as_mut()
        .ok_or("No lyrics loaded".to_string())?;

    sync.lyrics_mut().set_offset(offset_ms);

    Ok(())
}

/// Get lyrics offset in milliseconds
#[tauri::command]
pub fn get_lyrics_offset(state: State<Mutex<LyricsState>>) -> Result<i64, String> {
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    let sync = state_guard
        .sync
        .as_ref()
        .ok_or("No lyrics loaded".to_string())?;

    Ok(sync.lyrics().get_offset())
}

/// Reset lyrics sync state
#[tauri::command]
pub fn reset_lyrics(state: State<Mutex<LyricsState>>) -> Result<(), String> {
    let mut state_guard = state.lock().map_err(|e| e.to_string())?;
    if let Some(sync) = state_guard.sync.as_mut() {
        sync.reset();
    }

    Ok(())
}

/// Get all lyrics lines
#[tauri::command]
pub fn get_all_lyrics(state: State<Mutex<LyricsState>>) -> Result<Vec<crate::lyrics::LyricLine>, String> {
    let state_guard = state.lock().map_err(|e| e.to_string())?;
    let sync = state_guard
        .sync
        .as_ref()
        .ok_or("No lyrics loaded".to_string())?;

    Ok(sync.lyrics().lines.clone())
}

/// Current line information
#[derive(serde::Serialize, Clone)]
pub struct CurrentLineInfo {
    pub current_index: usize,
    pub current_line: Option<crate::lyrics::LyricLine>,
    pub prev_line: Option<crate::lyrics::LyricLine>,
    pub next_line: Option<crate::lyrics::LyricLine>,
    pub line_changed: bool,
    pub progress_to_next: f64,
    pub has_word_level: bool,
}
