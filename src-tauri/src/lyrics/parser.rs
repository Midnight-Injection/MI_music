use super::{LyricLine, Lyrics, LyricsError, LyricsMetadata, WordTimestamp};
use regex::Regex;

/// Parse LRC format lyrics
pub fn parse_lrc(content: &str) -> Result<Lyrics, LyricsError> {
    let content = content.trim();
    if content.is_empty() {
        return Err(LyricsError::EmptyLyrics);
    }

    let mut metadata = LyricsMetadata::default();
    let mut lines: Vec<LyricLine> = Vec::new();

    // Regex for metadata tags: [ti:title], [ar:artist], etc.
    let metadata_regex = Regex::new(r"^\[(ti|ar|al|by|length|offset):(.*)\]$")
        .map_err(|e| LyricsError::ParseError(format!("Failed to compile metadata regex: {}", e)))?;

    // Regex for time tags: [mm:ss.xx] or [mm:ss]
    let time_regex = Regex::new(r"\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]")
        .map_err(|e| LyricsError::ParseError(format!("Failed to compile time regex: {}", e)))?;

    // Regex for enhanced LRC with word timestamps: <mm:ss.xx>word
    let word_regex = Regex::new(r"<(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?>([^<]+)")
        .map_err(|e| LyricsError::ParseError(format!("Failed to compile word regex: {}", e)))?;

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // Try metadata first
        if let Some(caps) = metadata_regex.captures(line) {
            let tag = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let value = caps.get(2).map(|m| m.as_str()).unwrap_or("");

            match tag {
                "ti" => metadata.title = Some(value.to_string()),
                "ar" => metadata.artist = Some(value.to_string()),
                "al" => metadata.album = Some(value.to_string()),
                "by" => metadata.by = Some(value.to_string()),
                "length" => {
                    // Parse length in mm:ss format
                    if let Some((mins, secs)) = value.split_once(':') {
                        if let (Ok(m), Ok(s)) = (mins.parse::<u64>(), secs.parse::<u64>()) {
                            metadata.length = Some(m * 60 * 1000 + s * 1000);
                        }
                    }
                }
                "offset" => {
                    // Offset in milliseconds (can be negative)
                    if let Ok(_offset) = value.parse::<i64>() {
                        // Store offset, will be applied when creating Lyrics
                    }
                }
                _ => {}
            }
            continue;
        }

        // Parse time tags and lyric content
        let mut time_captures: Vec<(u64, String)> = Vec::new();

        for cap in time_regex.captures_iter(line) {
            let mins: u64 = cap
                .get(1)
                .and_then(|m| m.as_str().parse().ok())
                .unwrap_or(0);
            let secs: u64 = cap
                .get(2)
                .and_then(|m| m.as_str().parse().ok())
                .unwrap_or(0);
            let millis: u64 = cap
                .get(3)
                .and_then(|m| {
                    let ms_str = m.as_str();
                    // Handle both 2-digit and 3-digit milliseconds
                    if ms_str.len() == 2 {
                        format!("{}0", ms_str).parse().ok()
                    } else {
                        ms_str.parse().ok()
                    }
                })
                .unwrap_or(0);

            let time_ms = mins * 60 * 1000 + secs * 1000 + millis;

            // Get the lyric text after all time tags
            let text = time_regex.replace_all(line, "");
            let text = text.trim().to_string();

            if !text.is_empty() {
                time_captures.push((time_ms, text));
            }
        }

        // If we have time tags, add to lines
        if !time_captures.is_empty() {
            // Check for word-level timestamps
            for (time_ms, text) in time_captures {
                let words = if word_regex.is_match(&text) {
                    Some(parse_word_timestamps(&text, &word_regex)?)
                } else {
                    None
                };

                lines.push(LyricLine {
                    time_ms,
                    text: if words.is_some() {
                        // Remove word timestamps from text
                        word_regex.replace_all(&text, "$3").to_string()
                    } else {
                        text.clone()
                    },
                    translation: None,
                    romanization: None,
                    words,
                });
            }
        } else if !line.starts_with('[') {
            // Lyrics without timestamp (rare, but handle it)
            lines.push(LyricLine {
                time_ms: 0,
                text: line.to_string(),
                translation: None,
                romanization: None,
                words: None,
            });
        }
    }

    if lines.is_empty() {
        return Err(LyricsError::EmptyLyrics);
    }

    // Sort lines by time
    lines.sort_by_key(|l| l.time_ms);

    Ok(Lyrics {
        lines,
        metadata,
        offset: 0,
    })
}

/// Parse word-level timestamps from enhanced LRC
fn parse_word_timestamps(text: &str, regex: &Regex) -> Result<Vec<WordTimestamp>, LyricsError> {
    let mut words = Vec::new();
    let captures: Vec<_> = regex.captures_iter(text).collect();

    for cap in &captures {
        let mins: u64 = cap
            .get(1)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0);
        let secs: u64 = cap
            .get(2)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0);
        let millis: u64 = cap
            .get(3)
            .and_then(|m| {
                let ms_str = m.as_str();
                if ms_str.len() == 2 {
                    format!("{}0", ms_str).parse().ok()
                } else {
                    ms_str.parse().ok()
                }
            })
            .unwrap_or(0);

        let time_ms = mins * 60 * 1000 + secs * 1000 + millis;
        let word_text = cap.get(4).map(|m| m.as_str()).unwrap_or("").trim();

        if !word_text.is_empty() {
            words.push(WordTimestamp {
                time_ms,
                text: word_text.to_string(),
                duration: 0, // Will be calculated later
            });
        }
    }

    // Calculate durations
    for idx in 0..words.len() {
        if idx + 1 < words.len() {
            words[idx].duration = words[idx + 1].time_ms - words[idx].time_ms;
        } else {
            // Last word duration: default to 500ms
            words[idx].duration = 500;
        }
    }

    Ok(words)
}

/// Parse translation lyrics (separate file or embedded)
pub fn parse_translation(content: &str) -> Result<Vec<Option<String>>, LyricsError> {
    let mut translations = Vec::new();
    let time_regex = Regex::new(r"\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]")
        .map_err(|e| LyricsError::ParseError(format!("Failed to compile time regex: {}", e)))?;

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // Extract time and translation
        if let Some(cap) = time_regex.captures(line) {
            let _mins: u64 = cap
                .get(1)
                .and_then(|m| m.as_str().parse().ok())
                .unwrap_or(0);
            let _secs: u64 = cap
                .get(2)
                .and_then(|m| m.as_str().parse().ok())
                .unwrap_or(0);
            let _millis: u64 = cap
                .get(3)
                .and_then(|m| {
                    let ms_str = m.as_str();
                    if ms_str.len() == 2 {
                        format!("{}0", ms_str).parse().ok()
                    } else {
                        ms_str.parse().ok()
                    }
                })
                .unwrap_or(0);

            let text = time_regex.replace_all(line, "");
            let text = text.trim().to_string();

            translations.push(if text.is_empty() { None } else { Some(text) });
        }
    }

    Ok(translations)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_basic_lrc() {
        let lrc = r#"
[ti:Test Song]
[ar:Test Artist]
[00:12.34]First line
[00:15.67]Second line
[00:20.00]Third line
"#;

        let lyrics = parse_lrc(lrc).unwrap();
        assert_eq!(lyrics.metadata.title, Some("Test Song".to_string()));
        assert_eq!(lyrics.metadata.artist, Some("Test Artist".to_string()));
        assert_eq!(lyrics.lines.len(), 3);
        assert_eq!(lyrics.lines[0].text, "First line");
        assert_eq!(lyrics.lines[0].time_ms, 12340);
    }

    #[test]
    fn test_parse_word_timestamps() {
        let lrc = r#"[00:12.34]<00:12.34>Hello<00:12.80>World<00:13.00>!"#;

        let lyrics = parse_lrc(lrc).unwrap();
        assert_eq!(lyrics.lines.len(), 1);
        assert!(lyrics.lines[0].words.is_some());
        let words = lyrics.lines[0].words.as_ref().unwrap();
        assert_eq!(words.len(), 3);
        assert_eq!(words[0].text, "Hello");
        assert_eq!(words[1].text, "World");
        assert_eq!(words[2].text, "!");
    }
}
