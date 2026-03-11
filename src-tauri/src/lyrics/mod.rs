pub mod parser;
pub mod sync;

pub use parser::*;
pub use sync::*;

use serde::{Deserialize, Serialize};

/// Lyric line with timestamp
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricLine {
    /// Time in milliseconds
    pub time_ms: u64,
    /// Lyric text
    pub text: String,
    /// Translation text (optional)
    pub translation: Option<String>,
    /// Romanization text (optional)
    pub romanization: Option<String>,
    /// Word-level timestamps for逐字歌词 (word-by-word lyrics)
    pub words: Option<Vec<WordTimestamp>>,
}

/// Word timestamp for逐字歌词
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordTimestamp {
    /// Time in milliseconds
    pub time_ms: u64,
    /// Word text
    pub text: String,
    /// Duration in milliseconds
    pub duration: u64,
}

/// Parsed lyrics data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lyrics {
    /// All lyric lines sorted by time
    pub lines: Vec<LyricLine>,
    /// Lyrics metadata
    pub metadata: LyricsMetadata,
    /// Lyrics offset in milliseconds (user-adjustable)
    pub offset: i64,
}

/// Lyrics metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricsMetadata {
    /// Title
    pub title: Option<String>,
    /// Artist
    pub artist: Option<String>,
    /// Album
    pub album: Option<String>,
    /// Author
    pub author: Option<String>,
    /// Length of the song in milliseconds
    pub length: Option<u64>,
    /// Lyrics editor
    pub by: Option<String>,
}

impl Default for LyricsMetadata {
    fn default() -> Self {
        Self {
            title: None,
            artist: None,
            album: None,
            author: None,
            length: None,
            by: None,
        }
    }
}

impl Default for Lyrics {
    fn default() -> Self {
        Self {
            lines: Vec::new(),
            metadata: LyricsMetadata::default(),
            offset: 0,
        }
    }
}

impl Lyrics {
    /// Get current line index at given time
    pub fn get_line_at_time(&self, time_ms: u64) -> usize {
        let adjusted_time = if self.offset >= 0 {
            time_ms.saturating_add(self.offset as u64)
        } else {
            time_ms.saturating_sub((-self.offset) as u64)
        };

        match self
            .lines
            .binary_search_by(|line| line.time_ms.cmp(&adjusted_time))
        {
            Ok(idx) => idx,
            Err(idx) => {
                if idx == 0 {
                    0
                } else if idx >= self.lines.len() {
                    self.lines.len().saturating_sub(1)
                } else {
                    idx - 1
                }
            }
        }
    }

    /// Get current line at given time
    pub fn get_current_line(&self, time_ms: u64) -> Option<&LyricLine> {
        let idx = self.get_line_at_time(time_ms);
        self.lines.get(idx)
    }

    /// Check if has word-level lyrics
    pub fn has_word_level(&self) -> bool {
        self.lines
            .iter()
            .any(|line| line.words.is_some() && !line.words.as_ref().unwrap().is_empty())
    }

    /// Get word-level progress for current time
    pub fn get_word_progress(&self, time_ms: u64, line_index: usize) -> Option<(usize, f64)> {
        let line = self.lines.get(line_index)?;
        let words = line.words.as_ref()?;

        if words.is_empty() {
            return None;
        }

        let adjusted_time = if self.offset >= 0 {
            time_ms.saturating_add(self.offset as u64)
        } else {
            time_ms.saturating_sub((-self.offset) as u64)
        };

        for (idx, word) in words.iter().enumerate() {
            let word_end = word.time_ms.saturating_add(word.duration);
            if adjusted_time >= word.time_ms && adjusted_time < word_end {
                let progress = (adjusted_time - word.time_ms) as f64 / word.duration as f64;
                return Some((idx, progress));
            }
        }

        None
    }

    /// Update lyrics offset
    pub fn set_offset(&mut self, offset_ms: i64) {
        self.offset = offset_ms;
    }

    /// Get lyrics offset
    pub fn get_offset(&self) -> i64 {
        self.offset
    }
}

/// Lyrics error type
#[derive(Debug, thiserror::Error)]
pub enum LyricsError {
    #[error("Invalid LRC format: {0}")]
    InvalidFormat(String),

    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Empty lyrics")]
    EmptyLyrics,
}
