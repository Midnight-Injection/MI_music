use crate::api::{MusicInfo, Quality, LyricInfo};
use crate::api::SourceRegistry;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

/// Global source registry
static SOURCE_REGISTRY: OnceLock<SourceRegistry> = OnceLock::new();

/// Get or initialize the source registry
fn get_registry() -> &'static SourceRegistry {
    SOURCE_REGISTRY.get_or_init(|| SourceRegistry::new())
}

/// Search result wrapper for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MusicInfoWrapper {
    pub id: String,
    pub name: String,
    pub singer: String,
    pub source: String,
    pub songmid: String,
    pub album_id: String,
    pub interval: String,
    pub album_name: String,
    pub types: Vec<crate::api::QualityInfo>,
    pub img: Option<String>,
}

impl From<MusicInfo> for MusicInfoWrapper {
    fn from(info: MusicInfo) -> Self {
        Self {
            id: format!("{}_{}", info.source, info.songmid),
            name: info.name,
            singer: info.singer,
            source: info.source,
            songmid: info.songmid,
            album_id: info.album_id,
            interval: info.interval,
            album_name: info.album_name,
            types: info.types,
            img: info.img,
        }
    }
}

/// Search for music from specified source
#[tauri::command]
pub async fn search_music_sources(
    keyword: String,
    source: String,
    page: u32,
    limit: u32,
) -> Result<Vec<MusicInfoWrapper>, String> {
    let registry = get_registry();

    // Get the requested source
    let music_source = registry.get_source(&source)
        .ok_or_else(|| format!("Unknown music source: {}", source))?;

    // Perform search
    let results = music_source.search(&keyword, page, limit)
        .await
        .map_err(|e| e.to_string())?;

    // Convert to wrapper format
    let wrapped: Vec<MusicInfoWrapper> = results
        .into_iter()
        .map(MusicInfoWrapper::from)
        .collect();

    Ok(wrapped)
}

/// Get song playback URL
#[tauri::command]
pub async fn get_song_url(
    song_id: String,
    source: String,
    quality: String,
) -> Result<String, String> {
    let registry = get_registry();

    let music_source = registry.get_source(&source)
        .ok_or_else(|| format!("Unknown music source: {}", source))?;

    let quality_enum = Quality::from_str(&quality)
        .ok_or_else(|| format!("Invalid quality: {}", quality))?;

    music_source.get_song_url(&song_id, quality_enum)
        .await
        .map_err(|e| e.to_string())
}

/// Get lyrics for a song
#[tauri::command]
pub async fn get_lyric(
    song_id: String,
    source: String,
) -> Result<LyricInfo, String> {
    let registry = get_registry();

    let music_source = registry.get_source(&source)
        .ok_or_else(|| format!("Unknown music source: {}", source))?;

    music_source.get_lyric(&song_id)
        .await
        .map_err(|e| e.to_string())
}

/// Get songs from a music source playlist (API-based)
#[tauri::command]
pub async fn get_source_playlist(
    playlist_id: String,
    source: String,
    page: u32,
    page_size: u32,
) -> Result<Vec<MusicInfoWrapper>, String> {
    let registry = get_registry();

    let music_source = registry.get_source(&source)
        .ok_or_else(|| format!("Unknown music source: {}", source))?;

    let results = music_source.get_playlist(&playlist_id, page, page_size)
        .await
        .map_err(|e| e.to_string())?;

    let wrapped: Vec<MusicInfoWrapper> = results
        .into_iter()
        .map(MusicInfoWrapper::from)
        .collect();

    Ok(wrapped)
}

/// Get list of available music sources
#[tauri::command]
pub fn get_available_sources() -> Vec<String> {
    get_registry().list_sources()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_registry_initialization() {
        let registry = get_registry();
        assert!(registry.has_source("kw"));
    }

    #[test]
    fn test_available_sources() {
        let sources = get_available_sources();
        assert!(sources.contains(&"kw".to_string()));
    }
}
