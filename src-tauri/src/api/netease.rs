use super::helpers::{build_client, format_duration_millis, format_size};
use super::source::{LyricInfo, MusicInfo, MusicSource, MusicSourceError, Quality, QualityInfo, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::Deserialize;

const NETEASE_SOURCE: &str = "wy";

pub struct NeteaseSource {
    client: Client,
}

impl NeteaseSource {
    pub fn new() -> Self {
        Self {
            client: build_client(),
        }
    }

    fn singers(artists: &[NeteaseArtist]) -> String {
        artists
            .iter()
            .map(|artist| artist.name.clone())
            .collect::<Vec<_>>()
            .join(" / ")
    }

    fn quality_list(song: &NeteaseSong) -> Vec<QualityInfo> {
        let mut types = Vec::new();
        if let Some(level) = &song.l {
            types.push(QualityInfo {
                quality_type: "128k".to_string(),
                size: format_size(level.size as u64),
            });
        }
        if let Some(level) = &song.h {
            types.push(QualityInfo {
                quality_type: "320k".to_string(),
                size: format_size(level.size as u64),
            });
        }
        if let Some(level) = &song.sq {
            types.push(QualityInfo {
                quality_type: "flac".to_string(),
                size: format_size(level.size as u64),
            });
        }
        if let Some(level) = &song.hr {
            types.push(QualityInfo {
                quality_type: "flac24bit".to_string(),
                size: format_size(level.size as u64),
            });
        }
        types
    }

    fn map_song(song: NeteaseSong) -> MusicInfo {
        let types = Self::quality_list(&song);
        MusicInfo {
            name: song.name,
            singer: Self::singers(&song.artists),
            source: NETEASE_SOURCE.to_string(),
            songmid: song.id.to_string(),
            album_id: song.album.id.to_string(),
            hash: None,
            str_media_mid: None,
            copyright_id: None,
            interval: format_duration_millis(song.duration),
            album_name: song.album.name,
            types,
            img: song.album.pic_url,
        }
    }
}

impl Default for NeteaseSource {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Deserialize)]
struct NeteaseSearchResponse {
    result: Option<NeteaseSearchResult>,
}

#[derive(Debug, Deserialize)]
struct NeteaseSearchResult {
    songs: Vec<NeteaseSong>,
}

#[derive(Debug, Deserialize, Clone)]
struct NeteaseSong {
    id: i64,
    name: String,
    #[serde(rename = "artists")]
    artists: Vec<NeteaseArtist>,
    #[serde(rename = "album")]
    album: NeteaseAlbum,
    #[serde(rename = "duration")]
    duration: i64,
    h: Option<NeteaseLevel>,
    l: Option<NeteaseLevel>,
    sq: Option<NeteaseLevel>,
    hr: Option<NeteaseLevel>,
}

#[derive(Debug, Deserialize, Clone)]
struct NeteaseArtist {
    name: String,
}

#[derive(Debug, Deserialize, Clone)]
struct NeteaseAlbum {
    id: i64,
    name: String,
    #[serde(rename = "picUrl")]
    pic_url: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
struct NeteaseLevel {
    size: i64,
}

#[derive(Debug, Deserialize)]
struct NeteaseSongUrlResponse {
    data: Vec<NeteaseSongUrlItem>,
}

#[derive(Debug, Deserialize)]
struct NeteaseSongUrlItem {
    url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct NeteaseLyricResponse {
    lrc: Option<NeteaseLyricText>,
    tlyric: Option<NeteaseLyricText>,
}

#[derive(Debug, Deserialize)]
struct NeteaseLyricText {
    lyric: String,
}

#[derive(Debug, Deserialize)]
struct NeteasePlaylistResponse {
    playlist: NeteasePlaylist,
}

#[derive(Debug, Deserialize)]
struct NeteasePlaylist {
    tracks: Vec<NeteaseSong>,
}

#[async_trait]
impl MusicSource for NeteaseSource {
    async fn search(&self, keyword: &str, page: u32, page_size: u32) -> Result<Vec<MusicInfo>> {
        let offset = (page.saturating_sub(1) * page_size) as usize;
        let url = format!(
            "https://music.163.com/api/search/get/web?type=1&s={}&offset={}&limit={}",
            urlencoding::encode(keyword),
            offset,
            page_size
        );
        let response = self.client.get(url).send().await?;
        let payload: NeteaseSearchResponse = response.json().await?;
        Ok(payload
            .result
            .map(|result| result.songs.into_iter().map(Self::map_song).collect())
            .unwrap_or_default())
    }

    async fn get_song_url(&self, song_id: &str, quality: Quality) -> Result<String> {
        let br = match quality {
            Quality::Standard => "128000",
            Quality::High => "320000",
            Quality::Lossless => "999000",
            Quality::Lossless24Bit => "1999000",
        };
        let ids = format!("[{}]", song_id);
        let response = self
            .client
            .get("https://music.163.com/api/song/enhance/player/url")
            .query(&[("id", song_id), ("ids", ids.as_str()), ("br", br)])
            .send()
            .await?;
        let payload: NeteaseSongUrlResponse = response.json().await?;
        payload
            .data
            .into_iter()
            .find_map(|item| item.url)
            .filter(|url| !url.is_empty())
            .ok_or_else(|| MusicSourceError::SongNotFound(song_id.to_string()))
    }

    async fn get_lyric(&self, song_id: &str) -> Result<LyricInfo> {
        let response = self
            .client
            .get("https://music.163.com/api/song/lyric")
            .query(&[
                ("id", song_id),
                ("lv", "-1"),
                ("kv", "-1"),
                ("tv", "-1"),
            ])
            .send()
            .await?;
        let payload: NeteaseLyricResponse = response.json().await?;
        let lyric = payload
            .lrc
            .map(|item| item.lyric)
            .ok_or_else(|| MusicSourceError::LyricsNotFound(song_id.to_string()))?;
        Ok(LyricInfo {
            lyric,
            tlyric: payload.tlyric.map(|item| item.lyric),
        })
    }

    async fn get_playlist(
        &self,
        playlist_id: &str,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<MusicInfo>> {
        let response = self
            .client
            .get("https://music.163.com/api/playlist/detail")
            .query(&[("id", playlist_id)])
            .send()
            .await?;
        let payload: NeteasePlaylistResponse = response.json().await?;
        let start = ((page.saturating_sub(1)) * page_size) as usize;
        let end = (start + page_size as usize).min(payload.playlist.tracks.len());
        if start >= payload.playlist.tracks.len() {
            return Ok(Vec::new());
        }
        Ok(payload.playlist.tracks[start..end]
            .iter()
            .cloned()
            .map(Self::map_song)
            .collect())
    }

    fn source_name(&self) -> &'static str {
        NETEASE_SOURCE
    }
}
