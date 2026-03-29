use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Playback status enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PlaybackStatus {
    Stopped,
    Playing,
    Paused,
    Buffering,
    Error,
}

/// Player state that can be shared with the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerState {
    pub status: PlaybackStatus,
    pub current_track: Option<CurrentTrack>,
    pub volume: f64,
    pub playback_rate: f64,
    pub position: f64, // in seconds
    pub duration: f64, // in seconds
    pub is_muted: bool,
}

/// Current track information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentTrack {
    pub id: i64,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub cover_url: Option<String>,
    pub audio_url: String,
    pub source: String,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            status: PlaybackStatus::Stopped,
            current_track: None,
            volume: 1.0,
            playback_rate: 1.0,
            position: 0.0,
            duration: 0.0,
            is_muted: false,
        }
    }
}

/// Internal player state (not exposed to frontend)
pub struct InternalPlayerState {
    pub state: PlayerState,
    pub queue: Vec<i64>, // Song IDs
    pub current_index: Option<usize>,
    pub loop_mode: LoopMode,
}

/// Loop mode for playback
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LoopMode {
    None, // Play through queue once
    All,  // Loop the entire queue
    One,  // Loop current track
}

impl Default for InternalPlayerState {
    fn default() -> Self {
        Self {
            state: PlayerState::default(),
            queue: Vec::new(),
            current_index: None,
            loop_mode: LoopMode::None,
        }
    }
}

/// Shared player state wrapper
pub type SharedPlayerState = Arc<Mutex<InternalPlayerState>>;

impl InternalPlayerState {
    /// Create a new internal player state
    pub fn new() -> Self {
        Self::default()
    }

    /// Get current player state (for frontend)
    pub fn get_player_state(&self) -> PlayerState {
        self.state.clone()
    }

    /// Set playback status
    pub fn set_status(&mut self, status: PlaybackStatus) {
        self.state.status = status;
    }

    /// Set current track
    pub fn set_current_track(&mut self, track: Option<CurrentTrack>) {
        self.state.current_track = track;
    }

    /// Update position
    pub fn set_position(&mut self, position: f64) {
        self.state.position = position;
    }

    /// Update duration
    pub fn set_duration(&mut self, duration: f64) {
        self.state.duration = duration;
    }

    /// Set volume
    pub fn set_volume(&mut self, volume: f64) {
        self.state.volume = volume.clamp(0.0, 1.0);
    }

    /// Set playback rate
    pub fn set_playback_rate(&mut self, rate: f64) {
        self.state.playback_rate = rate.clamp(0.5, 2.0);
    }

    /// Toggle mute
    pub fn toggle_mute(&mut self) -> bool {
        self.state.is_muted = !self.state.is_muted;
        self.state.is_muted
    }

    /// Set queue
    pub fn set_queue(&mut self, queue: Vec<i64>) {
        self.current_index = if queue.is_empty() { None } else { Some(0) };
        self.queue = queue;
    }

    /// Add to queue
    pub fn add_to_queue(&mut self, song_id: i64) {
        self.queue.push(song_id);
    }

    /// Remove from queue
    pub fn remove_from_queue(&mut self, index: usize) {
        if index < self.queue.len() {
            self.queue.remove(index);
            // Adjust current index if needed
            if let Some(current) = self.current_index {
                if current == index {
                    // If we removed the current track, reset to None
                    self.current_index = None;
                } else if current > index {
                    // Adjust index down if we removed something before it
                    self.current_index = Some(current - 1);
                }
            }
        }
    }

    /// Get current track ID
    pub fn current_track_id(&self) -> Option<i64> {
        self.current_index
            .and_then(|idx| self.queue.get(idx))
            .copied()
    }

    /// Move to next track
    pub fn next_track(&mut self) -> Option<i64> {
        match self.loop_mode {
            LoopMode::One => self.current_track_id(),
            _ => {
                if let Some(idx) = self.current_index {
                    let next_idx = idx + 1;
                    if next_idx < self.queue.len() {
                        self.current_index = Some(next_idx);
                        self.current_track_id()
                    } else if self.loop_mode == LoopMode::All {
                        self.current_index = Some(0);
                        self.current_track_id()
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
        }
    }

    /// Move to previous track
    pub fn previous_track(&mut self) -> Option<i64> {
        match self.loop_mode {
            LoopMode::One => self.current_track_id(),
            _ => {
                if let Some(idx) = self.current_index {
                    if idx > 0 {
                        self.current_index = Some(idx - 1);
                        self.current_track_id()
                    } else if self.loop_mode == LoopMode::All {
                        self.current_index = Some(self.queue.len().saturating_sub(1));
                        self.current_track_id()
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
        }
    }

    /// Set loop mode
    pub fn set_loop_mode(&mut self, mode: LoopMode) {
        self.loop_mode = mode;
    }

    /// Clear queue
    pub fn clear_queue(&mut self) {
        self.queue.clear();
        self.current_index = None;
    }

    /// Get queue length
    pub fn queue_length(&self) -> usize {
        self.queue.len()
    }

    /// Check if queue is empty
    pub fn is_queue_empty(&self) -> bool {
        self.queue.is_empty()
    }
}
