// Player module for music playback
// This module will handle audio playback functionality

pub mod audio;
pub mod state;

pub use audio::{AudioPlayer, AudioError, SharedAudioPlayer};
pub use state::{InternalPlayerState, PlayerState, SharedPlayerState, CurrentTrack, PlaybackStatus, LoopMode};

use std::sync::Arc;
use tokio::sync::Mutex;

/// Player instance combining audio and state
pub struct Player {
    pub audio: SharedAudioPlayer,
    pub state: SharedPlayerState,
}

impl Player {
    /// Create a new player instance
    pub fn new() -> Result<Self, AudioError> {
        let audio_player = AudioPlayer::new()?;
        Ok(Self {
            audio: Mutex::new(audio_player),
            state: Arc::new(Mutex::new(InternalPlayerState::new())),
        })
    }

    /// Get current state
    pub async fn get_state(&self) -> PlayerState {
        let state = self.state.lock().await;
        state.get_player_state()
    }
}

impl Default for Player {
    fn default() -> Self {
        Self::new().expect("Failed to create player")
    }
}

/// Shared player type for Tauri state
pub type SharedPlayer = Arc<Mutex<Player>>;
