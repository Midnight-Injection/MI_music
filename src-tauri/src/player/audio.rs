use std::fs::File;
use std::io::{BufReader, Cursor};
use std::time::Duration;
use thiserror::Error;
use reqwest::Client;

/// Audio player errors
#[derive(Error, Debug)]
pub enum AudioError {
    #[error("Failed to initialize audio output: {0}")]
    OutputInitError(String),

    #[error("Failed to load audio from URL: {0}")]
    UrlLoadError(String),

    #[error("Failed to load audio from file: {0}")]
    FileLoadError(String),

    #[error("Playback error: {0}")]
    PlaybackError(String),

    #[error("No audio source loaded")]
    NoSource,
}

/// Audio playback commands
#[derive(Debug)]
pub enum AudioCommand {
    LoadUrl(String),
    LoadFile(String),
    Play,
    Pause,
    Stop,
    Seek(f64),
    SetVolume(f64),
    SetSpeed(f64),
}

/// Audio player state
#[derive(Debug, Clone, Default)]
pub struct AudioState {
    pub is_playing: bool,
    pub is_paused: bool,
    pub volume: f32,
    pub speed: f32,
    pub position: f64,
    pub current_url: Option<String>,
}

/// Thread-safe audio player handle
pub struct AudioPlayer {
    state: AudioState,
    http_client: Client,
}

impl AudioPlayer {
    /// Create a new audio player handle
    pub fn new() -> Result<Self, AudioError> {
        Ok(Self {
            state: AudioState {
                is_playing: false,
                is_paused: false,
                volume: 1.0,
                speed: 1.0,
                position: 0.0,
                current_url: None,
            },
            http_client: Client::new(),
        })
    }

    /// Get current state
    pub fn get_state(&self) -> AudioState {
        self.state.clone()
    }

    /// Set volume
    pub fn set_volume(&mut self, volume: f64) -> Result<(), AudioError> {
        self.state.volume = volume.clamp(0.0, 1.0) as f32;
        Ok(())
    }

    /// Set playback speed
    pub fn set_speed(&mut self, speed: f64) -> Result<(), AudioError> {
        self.state.speed = speed.clamp(0.5, 2.0) as f32;
        Ok(())
    }

    /// Set position
    pub fn set_position(&mut self, position: f64) {
        self.state.position = position;
    }

    /// Check if playing
    pub fn is_playing(&self) -> bool {
        self.state.is_playing && !self.state.is_paused
    }

    /// Check if paused
    pub fn is_paused(&self) -> bool {
        self.state.is_paused
    }

    /// Get current position
    pub fn get_position(&self) -> f64 {
        self.state.position
    }

    /// Get volume
    pub fn get_volume(&self) -> f64 {
        self.state.volume as f64
    }

    /// Get speed
    pub fn get_speed(&self) -> f64 {
        self.state.speed as f64
    }

    /// Play
    pub fn play(&mut self) -> Result<(), AudioError> {
        self.state.is_playing = true;
        self.state.is_paused = false;
        Ok(())
    }

    /// Pause
    pub fn pause(&mut self) -> Result<(), AudioError> {
        self.state.is_paused = true;
        Ok(())
    }

    /// Resume
    pub fn resume(&mut self) -> Result<(), AudioError> {
        self.state.is_paused = false;
        Ok(())
    }

    /// Stop
    pub fn stop(&mut self) -> Result<(), AudioError> {
        self.state.is_playing = false;
        self.state.is_paused = false;
        self.state.position = 0.0;
        self.state.current_url = None;
        Ok(())
    }

    /// Seek to position
    pub fn seek(&mut self, position: f64) -> Result<(), AudioError> {
        self.state.position = position;
        Ok(())
    }

    /// Load from URL (download data for processing)
    pub async fn load_from_url(&mut self, url: &str) -> Result<(), AudioError> {
        // Verify URL is accessible
        let response = self.http_client
            .head(url)
            .send()
            .await
            .map_err(|e| AudioError::UrlLoadError(format!("Failed to fetch: {}", e)))?;

        if !response.status().is_success() {
            return Err(AudioError::UrlLoadError(
                format!("HTTP error: {}", response.status())
            ));
        }

        self.state.current_url = Some(url.to_string());
        self.state.position = 0.0;
        Ok(())
    }

    /// Load from file path
    pub fn load_from_file(&mut self, path: &str) -> Result<(), AudioError> {
        if !std::path::Path::new(path).exists() {
            return Err(AudioError::FileLoadError(format!("File not found: {}", path)));
        }

        self.state.current_url = Some(path.to_string());
        self.state.position = 0.0;
        Ok(())
    }

    /// Get current URL
    pub fn current_url(&self) -> Option<&str> {
        self.state.current_url.as_deref()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.state.current_url.is_none()
    }
}

impl Default for AudioPlayer {
    fn default() -> Self {
        Self::new().expect("Failed to create audio player")
    }
}

/// Thread-safe audio player wrapper
pub type SharedAudioPlayer = tokio::sync::Mutex<AudioPlayer>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_player_creation() {
        let player = AudioPlayer::new();
        assert!(player.is_ok());
    }

    #[test]
    fn test_volume_clamping() {
        let mut player = AudioPlayer::new().unwrap();
        player.set_volume(1.5).unwrap();
        assert_eq!(player.get_volume(), 1.0);

        player.set_volume(-0.5).unwrap();
        assert_eq!(player.get_volume(), 0.0);

        player.set_volume(0.5).unwrap();
        assert_eq!(player.get_volume(), 0.5);
    }

    #[test]
    fn test_speed_clamping() {
        let mut player = AudioPlayer::new().unwrap();
        player.set_speed(3.0).unwrap();
        assert_eq!(player.get_speed(), 2.0);

        player.set_speed(0.2).unwrap();
        assert_eq!(player.get_speed(), 0.5);

        player.set_speed(1.5).unwrap();
        assert_eq!(player.get_speed(), 1.5);
    }

    #[test]
    fn test_playback_controls() {
        let mut player = AudioPlayer::new().unwrap();

        assert!(!player.is_playing());
        assert!(!player.is_paused());

        player.play().unwrap();
        assert!(player.is_playing());
        assert!(!player.is_paused());

        player.pause().unwrap();
        assert!(!player.is_playing());
        assert!(player.is_paused());

        player.resume().unwrap();
        assert!(player.is_playing());
        assert!(!player.is_paused());

        player.stop().unwrap();
        assert!(!player.is_playing());
        assert!(!player.is_paused());
        assert_eq!(player.get_position(), 0.0);
    }

    #[test]
    fn test_seek() {
        let mut player = AudioPlayer::new().unwrap();

        player.seek(30.0).unwrap();
        assert_eq!(player.get_position(), 30.0);

        player.seek(60.0).unwrap();
        assert_eq!(player.get_position(), 60.0);
    }

    #[test]
    fn test_load_from_file_nonexistent() {
        let mut player = AudioPlayer::new().unwrap();
        let result = player.load_from_file("/nonexistent/file.mp3");
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_state() {
        let player = AudioPlayer::new().unwrap();
        assert!(player.is_empty());
    }
}
