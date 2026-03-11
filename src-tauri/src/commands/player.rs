use crate::player::{Player, PlaybackStatus, SharedPlayer, CurrentTrack};
use crate::db::models::song::Song;
use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Play music from URL
#[tauri::command]
pub async fn play_music(
    url: String,
    song_id: i64,
    player: State<'_, SharedPlayer>,
) -> Result<String, String> {
    let mut player_guard = player.lock().await;
    let mut audio = player_guard.audio.lock().await;

    // Load audio from URL
    audio.load_from_url(&url).await
        .map_err(|e| e.to_string())?;

    // Start playback
    audio.play()
        .map_err(|e| e.to_string())?;

    // Update state
    let mut state = player_guard.state.lock().await;
    state.set_status(PlaybackStatus::Playing);

    Ok(format!("Playing: {}", url))
}

/// Play music by song ID (from database)
#[tauri::command]
pub async fn play_song_by_id(
    song_id: i64,
    player: State<'_, SharedPlayer>,
    db: State<'_, Arc<Mutex<Option<crate::db::Database>>>>,
) -> Result<String, String> {
    // Get song from database
    let db_guard = db.lock().await;
    let db = db_guard.as_ref().ok_or("Database not initialized")?;
    let pool = db.pool();

    let song = Song::get_by_id(pool, song_id)
        .await
        .map_err(|e| format!("Failed to get song: {}", e))?
        .ok_or("Song not found")?;

    // Play the song
    let mut player_guard = player.lock().await;
    let mut audio = player_guard.audio.lock().await;

    // Load audio from URL
    audio.load_from_url(&song.audio_url).await
        .map_err(|e| e.to_string())?;

    // Start playback
    audio.play()
        .map_err(|e| e.to_string())?;

    // Update state with current track info
    let artist = song.artist.clone();
    let title = song.title.clone();
    let mut state = player_guard.state.lock().await;
    state.set_status(PlaybackStatus::Playing);
    state.set_current_track(Some(CurrentTrack {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        cover_url: song.cover_url,
        audio_url: song.audio_url,
        source: song.source,
    }));
    state.set_duration(song.duration.unwrap_or(0) as f64);

    Ok(format!("Playing: {} - {}", artist, title))
}

/// Pause music
#[tauri::command]
pub async fn pause_music(
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let mut player_guard = player.lock().await;
    let mut audio = player_guard.audio.lock().await;

    audio.pause()
        .map_err(|e| e.to_string())?;

    // Update state
    let mut state = player_guard.state.lock().await;
    state.set_status(PlaybackStatus::Paused);

    Ok(())
}

/// Resume music
#[tauri::command]
pub async fn resume_music(
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let mut player_guard = player.lock().await;
    let mut audio = player_guard.audio.lock().await;

    audio.resume()
        .map_err(|e| e.to_string())?;

    // Update state
    let mut state = player_guard.state.lock().await;
    state.set_status(PlaybackStatus::Playing);

    Ok(())
}

/// Stop music
#[tauri::command]
pub async fn stop_music(
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let mut player_guard = player.lock().await;
    let mut audio = player_guard.audio.lock().await;

    audio.stop()
        .map_err(|e| e.to_string())?;

    // Update state
    let mut state = player_guard.state.lock().await;
    state.set_status(PlaybackStatus::Stopped);
    state.set_position(0.0);
    state.set_current_track(None);

    Ok(())
}

/// Seek to position (in seconds)
#[tauri::command]
pub async fn seek_to(
    position: f64,
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let mut player_guard = player.lock().await;
    let mut audio = player_guard.audio.lock().await;

    audio.seek(position)
        .map_err(|e| e.to_string())?;

    // Update state
    let mut state = player_guard.state.lock().await;
    state.set_position(position);

    Ok(())
}

/// Set volume (0.0 to 1.0)
#[tauri::command]
pub async fn set_volume(
    volume: f64,
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let mut player_guard = player.lock().await;
    let mut audio = player_guard.audio.lock().await;

    audio.set_volume(volume)
        .map_err(|e| e.to_string())?;

    // Update state
    let mut state = player_guard.state.lock().await;
    state.set_volume(volume);

    Ok(())
}

/// Set playback rate (0.5 to 2.0)
#[tauri::command]
pub async fn set_playback_rate(
    rate: f64,
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let mut player_guard = player.lock().await;
    let mut audio = player_guard.audio.lock().await;

    audio.set_speed(rate)
        .map_err(|e| e.to_string())?;

    // Update state
    let mut state = player_guard.state.lock().await;
    state.set_playback_rate(rate);

    Ok(())
}

/// Get current player state
#[tauri::command]
pub async fn get_player_state(
    player: State<'_, SharedPlayer>,
) -> Result<crate::player::PlayerState, String> {
    let player_guard = player.lock().await;

    // Update position from audio player
    let position = player_guard.audio.lock().await.get_position();

    let mut state = player_guard.state.lock().await;
    state.set_position(position);

    Ok(state.get_player_state())
}

/// Play next track in queue
#[tauri::command]
pub async fn play_next(
    player: State<'_, SharedPlayer>,
    db: State<'_, Arc<Mutex<Option<crate::db::Database>>>>,
) -> Result<Option<String>, String> {
    let mut player_guard = player.lock().await;

    // Get next track from queue
    let next_track_id = {
        let mut state = player_guard.state.lock().await;
        state.next_track()
    };

    if let Some(track_id) = next_track_id {
        // Get song from database
        let db_guard = db.lock().await;
        let db = db_guard.as_ref().ok_or("Database not initialized")?;
        let pool = db.pool();

        let song = Song::get_by_id(pool, track_id)
            .await
            .map_err(|e| format!("Failed to get song: {}", e))?
            .ok_or("Song not found")?;

        // Load and play
        let mut audio = player_guard.audio.lock().await;
        audio.load_from_url(&song.audio_url).await
            .map_err(|e| e.to_string())?;

        audio.play()
            .map_err(|e| e.to_string())?;

        // Update state
        let artist = song.artist.clone();
        let title = song.title.clone();
        let mut state = player_guard.state.lock().await;
        state.set_status(PlaybackStatus::Playing);
        state.set_current_track(Some(CurrentTrack {
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            cover_url: song.cover_url,
            audio_url: song.audio_url,
            source: song.source,
        }));
        state.set_duration(song.duration.unwrap_or(0) as f64);

        Ok(Some(format!("Playing: {} - {}", artist, title)))
    } else {
        // No next track, stop playback
        let mut audio = player_guard.audio.lock().await;
        audio.stop()
            .map_err(|e| e.to_string())?;

        let mut state = player_guard.state.lock().await;
        state.set_status(PlaybackStatus::Stopped);
        state.set_current_track(None);

        Ok(None)
    }
}

/// Play previous track in queue
#[tauri::command]
pub async fn play_previous(
    player: State<'_, SharedPlayer>,
    db: State<'_, Arc<Mutex<Option<crate::db::Database>>>>,
) -> Result<Option<String>, String> {
    let mut player_guard = player.lock().await;

    // Get previous track from queue
    let prev_track_id = {
        let mut state = player_guard.state.lock().await;
        state.previous_track()
    };

    if let Some(track_id) = prev_track_id {
        // Get song from database
        let db_guard = db.lock().await;
        let db = db_guard.as_ref().ok_or("Database not initialized")?;
        let pool = db.pool();

        let song = Song::get_by_id(pool, track_id)
            .await
            .map_err(|e| format!("Failed to get song: {}", e))?
            .ok_or("Song not found")?;

        // Load and play
        let mut audio = player_guard.audio.lock().await;
        audio.load_from_url(&song.audio_url).await
            .map_err(|e| e.to_string())?;

        audio.play()
            .map_err(|e| e.to_string())?;

        // Update state
        let artist = song.artist.clone();
        let title = song.title.clone();
        let mut state = player_guard.state.lock().await;
        state.set_status(PlaybackStatus::Playing);
        state.set_current_track(Some(CurrentTrack {
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            cover_url: song.cover_url,
            audio_url: song.audio_url,
            source: song.source,
        }));
        state.set_duration(song.duration.unwrap_or(0) as f64);

        Ok(Some(format!("Playing: {} - {}", artist, title)))
    } else {
        Ok(None)
    }
}

/// Set queue (list of song IDs)
#[tauri::command]
pub async fn set_queue(
    song_ids: Vec<i64>,
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let player_guard = player.lock().await;
    let mut state = player_guard.state.lock().await;
    state.set_queue(song_ids);
    Ok(())
}

/// Add song to queue
#[tauri::command]
pub async fn add_to_queue(
    song_id: i64,
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let player_guard = player.lock().await;
    let mut state = player_guard.state.lock().await;
    state.add_to_queue(song_id);
    Ok(())
}

/// Remove song from queue by index
#[tauri::command]
pub async fn remove_from_queue(
    index: usize,
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let player_guard = player.lock().await;
    let mut state = player_guard.state.lock().await;
    state.remove_from_queue(index);
    Ok(())
}

/// Clear queue
#[tauri::command]
pub async fn clear_queue(
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let player_guard = player.lock().await;
    let mut state = player_guard.state.lock().await;
    state.clear_queue();
    Ok(())
}

/// Get queue
#[tauri::command]
pub async fn get_queue(
    player: State<'_, SharedPlayer>,
) -> Result<Vec<i64>, String> {
    let player_guard = player.lock().await;
    let state = player_guard.state.lock().await;
    Ok(state.queue.clone())
}

/// Set loop mode
#[tauri::command]
pub async fn set_loop_mode(
    mode: String,
    player: State<'_, SharedPlayer>,
) -> Result<(), String> {
    let loop_mode = match mode.as_str() {
        "none" => crate::player::LoopMode::None,
        "all" => crate::player::LoopMode::All,
        "one" => crate::player::LoopMode::One,
        _ => return Err(format!("Invalid loop mode: {}", mode)),
    };

    let player_guard = player.lock().await;
    let mut state = player_guard.state.lock().await;
    state.set_loop_mode(loop_mode);
    Ok(())
}

/// Toggle mute
#[tauri::command]
pub async fn toggle_mute(
    player: State<'_, SharedPlayer>,
) -> Result<bool, String> {
    let mut player_guard = player.lock().await;

    let mut state = player_guard.state.lock().await;
    let is_muted = state.toggle_mute();

    if is_muted {
        let mut audio = player_guard.audio.lock().await;
        audio.set_volume(0.0)
            .map_err(|e| e.to_string())?;
    } else {
        let mut audio = player_guard.audio.lock().await;
        audio.set_volume(state.state.volume)
            .map_err(|e| e.to_string())?;
    }

    Ok(is_muted)
}
