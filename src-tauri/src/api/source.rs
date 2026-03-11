use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Common error types for music source operations
#[derive(Error, Debug)]
pub enum MusicSourceError {
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("JSON parsing error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Song not found: {0}")]
    SongNotFound(String),

    #[error("Lyrics not found for song: {0}")]
    LyricsNotFound(String),

    #[error("Playlist not found: {0}")]
    PlaylistNotFound(String),

    #[error("Invalid quality: {0}")]
    InvalidQuality(String),

    #[error("API rate limit exceeded")]
    RateLimitExceeded,

    #[error("Authentication failed")]
    AuthenticationFailed,

    #[error("Unknown error: {0}")]
    Unknown(String),
}

pub type Result<T> = std::result::Result<T, MusicSourceError>;

/// Audio quality types supported by music sources
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Quality {
    /// Standard quality (128kbps)
    Standard,
    /// High quality (320kbps)
    High,
    /// Lossless quality (FLAC)
    Lossless,
    /// 24-bit lossless quality
    Lossless24Bit,
}

impl Quality {
    pub fn as_str(&self) -> &'static str {
        match self {
            Quality::Standard => "128k",
            Quality::High => "320k",
            Quality::Lossless => "flac",
            Quality::Lossless24Bit => "flac24bit",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "128k" => Some(Quality::Standard),
            "320k" => Some(Quality::High),
            "flac" => Some(Quality::Lossless),
            "flac24bit" => Some(Quality::Lossless24Bit),
            _ => None,
        }
    }
}

/// Information about available quality types for a song
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityInfo {
    /// Quality type
    #[serde(rename = "type")]
    pub quality_type: String,
    /// File size in human-readable format
    pub size: String,
}

/// Music information returned by search and playlist operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MusicInfo {
    /// Song name
    pub name: String,
    /// Artist name(s)
    pub singer: String,
    /// Source identifier (kw, kg, wy, tx, mg)
    pub source: String,
    /// Unique song ID
    pub songmid: String,
    /// Album ID
    pub album_id: String,
    /// Duration in MM:SS format
    pub interval: String,
    /// Album name
    pub album_name: String,
    /// Available quality types
    pub types: Vec<QualityInfo>,
    /// Cover image URL (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub img: Option<String>,
}

/// Lyrics information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricInfo {
    /// Original lyrics in LRC format
    pub lyric: String,
    /// Translated lyrics (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tlyric: Option<String>,
}

/// Trait defining the interface for music source implementations
#[async_trait]
pub trait MusicSource: Send + Sync {
    /// Search for songs by keyword
    ///
    /// # Arguments
    /// * `keyword` - Search query (song name, artist, or both)
    /// * `page` - Page number (1-based)
    /// * `page_size` - Number of results per page
    async fn search(
        &self,
        keyword: &str,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<MusicInfo>>;

    /// Get the streamable URL for a song
    ///
    /// # Arguments
    /// * `song_id` - Unique song identifier
    /// * `quality` - Desired audio quality
    async fn get_song_url(&self, song_id: &str, quality: Quality) -> Result<String>;

    /// Get lyrics for a song
    ///
    /// # Arguments
    /// * `song_id` - Unique song identifier
    async fn get_lyric(&self, song_id: &str) -> Result<LyricInfo>;

    /// Get songs from a playlist
    ///
    /// # Arguments
    /// * `playlist_id` - Playlist identifier
    /// * `page` - Page number (1-based)
    /// * `page_size` - Number of songs per page
    async fn get_playlist(
        &self,
        playlist_id: &str,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<MusicInfo>>;

    /// Get the source identifier for this music source
    fn source_name(&self) -> &'static str;
}
