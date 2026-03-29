use super::Lyrics;

/// Lyrics sync manager
pub struct LyricsSync {
    lyrics: Lyrics,
    current_line_index: usize,
    last_update_time: u64,
}

impl LyricsSync {
    /// Create a new lyrics sync manager
    pub fn new(lyrics: Lyrics) -> Self {
        Self {
            lyrics,
            current_line_index: 0,
            last_update_time: 0,
        }
    }

    /// Update current position and return the active line
    pub fn update(&mut self, time_ms: u64) -> LyricLineUpdate {
        let new_index = self.lyrics.get_line_at_time(time_ms);
        let line_changed = new_index != self.current_line_index;

        self.current_line_index = new_index;
        self.last_update_time = time_ms;

        let current_line = self.lyrics.lines.get(new_index).cloned();
        let prev_line = if new_index > 0 {
            self.lyrics.lines.get(new_index - 1).cloned()
        } else {
            None
        };
        let next_line = self.lyrics.lines.get(new_index + 1).cloned();

        LyricLineUpdate {
            current_index: new_index,
            current_line,
            prev_line,
            next_line,
            line_changed,
            time_ms,
        }
    }

    /// Get current line index
    pub fn current_index(&self) -> usize {
        self.current_line_index
    }

    /// Get lyrics reference
    pub fn lyrics(&self) -> &Lyrics {
        &self.lyrics
    }

    /// Get mutable lyrics reference
    pub fn lyrics_mut(&mut self) -> &mut Lyrics {
        &mut self.lyrics
    }

    /// Reset sync state
    pub fn reset(&mut self) {
        self.current_line_index = 0;
        self.last_update_time = 0;
    }

    /// Calculate progress to next line (0.0 to 1.0)
    pub fn progress_to_next(&self, time_ms: u64) -> f64 {
        if self.current_line_index >= self.lyrics.lines.len().saturating_sub(1) {
            return 1.0;
        }

        let current_line = match self.lyrics.lines.get(self.current_line_index) {
            Some(line) => line,
            None => return 0.0,
        };

        let next_line = match self.lyrics.lines.get(self.current_line_index + 1) {
            Some(line) => line,
            None => return 1.0,
        };

        let current_time = if self.lyrics.offset >= 0 {
            time_ms.saturating_add(self.lyrics.offset as u64)
        } else {
            time_ms.saturating_sub((-self.lyrics.offset) as u64)
        };

        let duration = next_line.time_ms.saturating_sub(current_line.time_ms);
        if duration == 0 {
            return 1.0;
        }

        let elapsed = current_time.saturating_sub(current_line.time_ms);
        (elapsed as f64 / duration as f64).clamp(0.0, 1.0)
    }

    /// Get word-level progress for current line
    pub fn word_progress(&self, time_ms: u64) -> Option<WordProgress> {
        let (word_index, progress) = self
            .lyrics
            .get_word_progress(time_ms, self.current_line_index)?;

        Some(WordProgress {
            word_index,
            progress,
        })
    }

    /// Check if current line has word-level lyrics
    pub fn has_word_level(&self) -> bool {
        self.lyrics
            .lines
            .get(self.current_line_index)
            .and_then(|line| line.words.as_ref())
            .map(|words| !words.is_empty())
            .unwrap_or(false)
    }
}

/// Lyric line update info
#[derive(Debug, Clone)]
pub struct LyricLineUpdate {
    /// Current line index
    pub current_index: usize,
    /// Current line
    pub current_line: Option<super::LyricLine>,
    /// Previous line
    pub prev_line: Option<super::LyricLine>,
    /// Next line
    pub next_line: Option<super::LyricLine>,
    /// Whether the line changed since last update
    pub line_changed: bool,
    /// Current playback time in milliseconds
    pub time_ms: u64,
}

/// Word-level progress
#[derive(Debug, Clone, Copy)]
pub struct WordProgress {
    /// Current word index
    pub word_index: usize,
    /// Progress within current word (0.0 to 1.0)
    pub progress: f64,
}

#[cfg(test)]
mod tests {
    use super::super::{LyricLine, Lyrics, LyricsMetadata};
    use super::*;

    #[test]
    fn test_sync_basic() {
        let lyrics = Lyrics {
            lines: vec![
                LyricLine {
                    time_ms: 1000,
                    text: "First".to_string(),
                    translation: None,
                    romanization: None,
                    words: None,
                },
                LyricLine {
                    time_ms: 3000,
                    text: "Second".to_string(),
                    translation: None,
                    romanization: None,
                    words: None,
                },
            ],
            metadata: LyricsMetadata::default(),
            offset: 0,
        };

        let mut sync = LyricsSync::new(lyrics);

        // At time 0, should show first line
        let update = sync.update(0);
        assert_eq!(update.current_index, 0);
        assert_eq!(update.current_line.unwrap().text, "First");

        // At time 2000, still first line
        let update = sync.update(2000);
        assert_eq!(update.current_index, 0);

        // At time 3000, second line
        let update = sync.update(3000);
        assert_eq!(update.current_index, 1);
        assert!(update.line_changed);
    }

    #[test]
    fn test_progress_to_next() {
        let lyrics = Lyrics {
            lines: vec![
                LyricLine {
                    time_ms: 1000,
                    text: "First".to_string(),
                    translation: None,
                    romanization: None,
                    words: None,
                },
                LyricLine {
                    time_ms: 3000,
                    text: "Second".to_string(),
                    translation: None,
                    romanization: None,
                    words: None,
                },
            ],
            metadata: LyricsMetadata::default(),
            offset: 0,
        };

        let sync = LyricsSync::new(lyrics);

        // At time 2000 (middle of 2000ms duration), should be 0.5
        let progress = sync.progress_to_next(2000);
        assert!((progress - 0.5).abs() < 0.01);
    }
}
