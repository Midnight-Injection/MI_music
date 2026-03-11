use super::source::{LyricInfo, MusicInfo, MusicSource, Quality, QualityInfo, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;

const KUWO_SOURCE: &str = "kw";

/// Kuwo Music API implementation
pub struct KuwoSource {
    client: Client,
}

impl KuwoSource {
    /// Create a new Kuwo music source instance
    pub fn new() -> Self {
        let client = Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36")
            .connect_timeout(Duration::from_secs(8))
            .timeout(Duration::from_secs(12))
            .build()
            .unwrap();

        Self { client }
    }
}

impl Default for KuwoSource {
    fn default() -> Self {
        Self::new()
    }
}

/// Kuwo search response structure
#[derive(Debug, Deserialize)]
struct KuwoSearchResponse {
    #[serde(rename = "abslist")]
    abslist: Vec<KuwoSongInfo>,
    #[serde(rename = "TOTAL")]
    total: Option<String>,
}

#[derive(Debug, Deserialize)]
struct KuwoSongInfo {
    #[serde(rename = "MUSICRID")]
    musicrid: String,
    #[serde(rename = "SONGNAME")]
    songname: String,
    #[serde(rename = "ARTIST")]
    artist: String,
    #[serde(rename = "ALBUM")]
    album: Option<String>,
    #[serde(rename = "ALBUMID")]
    albumid: Option<String>,
    #[serde(rename = "DURATION")]
    duration: String,
    #[serde(rename = "N_MINFO")]
    n_minfo: Option<String>,
}

/// Kuwo music URL response structure
#[derive(Debug, Deserialize)]
struct KuwoUrlResponse {
    code: i32,
    url: Option<String>,
    msg: String,
}

/// Kuwo lyrics response structure
#[derive(Debug, Deserialize)]
struct KuwoLyricResponse {
    #[serde(rename = "lrclist")]
    lrclist: Option<Vec<KuwoLyricLine>>,
    #[serde(rename = "lrclist_tlyric")]
    lrclist_tlyric: Option<Vec<KuwoLyricLine>>,
}

#[derive(Debug, Deserialize)]
struct KuwoLyricLine {
    time: f64,
    #[serde(rename = "lineLyric")]
    line_lyric: String,
}

/// Kuwo playlist response structure
#[derive(Debug, Deserialize)]
struct KuwoPlaylistResponse {
    #[serde(rename = "musiclist")]
    musiclist: Option<Vec<KuwoPlaylistSong>>,
}

#[derive(Debug, Deserialize)]
struct KuwoPlaylistSong {
    #[serde(rename = "rid")]
    rid: String,
    #[serde(rename = "name")]
    name: String,
    #[serde(rename = "artist")]
    artist: String,
    #[serde(rename = "album")]
    album: Option<String>,
    #[serde(rename = "albumid")]
    albumid: Option<String>,
    #[serde(rename = "duration")]
    duration: i64,
    #[serde(rename = "albumpic")]
    albumpic: Option<String>,
}

impl KuwoSource {
    /// Decode HTML entities in text
    fn decode_html_entities(text: &str) -> String {
        text.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
    }

    /// Format duration from seconds to MM:SS
    fn format_duration(seconds: i64) -> String {
        let mins = seconds / 60;
        let secs = seconds % 60;
        format!("{:02}:{:02}", mins, secs)
    }

    /// Parse quality information from N_MINFO field
    fn parse_quality_info(n_minfo: &str) -> Vec<QualityInfo> {
        let mut types = Vec::new();

        for info in n_minfo.split(';') {
            if let Some(caps) = Self::extract_quality_info(info) {
                types.push(caps);
            }
        }

        types.reverse(); // Highest quality first
        types
    }

    /// Extract quality info from a single quality string
    fn extract_quality_info(info: &str) -> Option<QualityInfo> {
        // Pattern: level:xxx,bitrate:xxx,format:xxx,size:xxx
        let bitrate = Self::extract_field(info, "bitrate")?;
        let size = Self::extract_field(info, "size").unwrap_or_else(|| "0".to_string());

        let quality_type = match bitrate.as_str() {
            "4000" => "flac24bit",
            "2000" => "flac",
            "320" => "320k",
            "128" => "128k",
            _ => return None,
        };

        Some(QualityInfo {
            quality_type: quality_type.to_string(),
            size,
        })
    }

    /// Extract a field value from key-value pattern
    fn extract_field(info: &str, key: &str) -> Option<String> {
        let pattern = format!("{}:", key);
        info.find(&pattern).and_then(|pos| {
            let start = pos + pattern.len();
            let end = info[start..].find(',').unwrap_or_else(|| info[start..].len());
            Some(info[start..start + end].to_string())
        })
    }

    /// Encrypt lyrics parameters using XOR encryption
    fn encrypt_lyric_params(id: &str, is_get_lyricx: bool) -> String {
        let mut params = format!(
            "user=12345,web,web,web&requester=localhost&req=1&rid=MUSIC_{}",
            id
        );

        if is_get_lyricx {
            params.push_str("&lrcx=1");
        }

        let key = b"yeelion";
        let mut encrypted = Vec::new();

        for (i, byte) in params.bytes().enumerate() {
            encrypted.push(byte ^ key[i % key.len()]);
        }

        use base64::Engine;
        base64::engine::general_purpose::STANDARD.encode(&encrypted)
    }

    /// Convert LRC list to LRC format string
    fn lrclist_to_lrc(lrclist: &[KuwoLyricLine]) -> String {
        lrclist
            .iter()
            .map(|line| {
                let minutes = (line.time / 60.0) as i32;
                let seconds = line.time % 60.0;
                format!("[{:02}:{:05.2}]{}", minutes, seconds, line.line_lyric)
            })
            .collect::<Vec<_>>()
            .join("\n")
    }
}

#[async_trait]
impl MusicSource for KuwoSource {
    async fn search(&self, keyword: &str, page: u32, page_size: u32) -> Result<Vec<MusicInfo>> {
        let url = format!(
            "http://search.kuwo.cn/r.s?client=kt&all={}&pn={}&rn={}&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1",
            urlencoding::encode(keyword),
            page - 1,
            page_size
        );

        let response = self.client.get(&url).send().await?;
        let search_response: KuwoSearchResponse = response.json().await?;

        let mut music_list = Vec::new();

        for song in search_response.abslist {
            let song_id = song.musicrid.replace("MUSIC_", "");
            let quality_types = song
                .n_minfo
                .as_ref()
                .map(|info| Self::parse_quality_info(info))
                .unwrap_or_default();

            let music_info = MusicInfo {
                name: Self::decode_html_entities(&song.songname),
                singer: Self::decode_html_entities(&song.artist),
                source: KUWO_SOURCE.to_string(),
                songmid: song_id.clone(),
                album_id: song.albumid.unwrap_or_default(),
                interval: song.duration,
                album_name: song.album.unwrap_or_default(),
                types: quality_types,
                img: None,
            };

            music_list.push(music_info);
        }

        Ok(music_list)
    }

    async fn get_song_url(&self, song_id: &str, quality: Quality) -> Result<String> {
        let format_str = match quality {
            Quality::Lossless24Bit => "flac",
            Quality::Lossless => "flac",
            Quality::High => "320kmp3",
            Quality::Standard => "128kmp3",
        };

        // Use official Kuwo API to get song URL
        let url = format!(
            "https://antiserver.kuwo.cn/anti.s?type=convert_url3&rid={}&format={}",
            song_id, format_str
        );

        let response = self.client.get(&url).send().await?;
        let response_text = response.text().await?;

        // Try to parse as JSON first (new API format)
        if let Ok(url_response) = serde_json::from_str::<KuwoUrlResponse>(&response_text) {
            if url_response.code == 200 {
                if let Some(song_url) = url_response.url {
                    return Ok(song_url);
                }
            }
        }

        // Check if it's a plain URL response (old API format)
        let url_text = response_text.trim();
        if url_text.starts_with("http") {
            return Ok(url_text.to_string());
        }

        // Try alternative API format
        let alt_url = format!(
            "http://antiserver.kuwo.cn/anti.s?type=convert_url&rid={}&format=mp3&response=url",
            song_id
        );
        let alt_response = self.client.get(&alt_url).send().await?;
        let alt_text = alt_response.text().await?;
        let alt_text = alt_text.trim();

        if alt_text.is_empty() || alt_text.contains("error") || alt_text.contains("not found") {
            return Err(super::source::MusicSourceError::SongNotFound(song_id.to_string()));
        }
        Ok(alt_text.to_string())
    }

    async fn get_lyric(&self, song_id: &str) -> Result<LyricInfo> {
        let encrypted_params = Self::encrypt_lyric_params(song_id, false);
        let url = format!(
            "http://newlyric.kuwo.cn/newlyric.lrc?{}",
            encrypted_params
        );

        let response = self.client.get(&url).send().await?;

        // Try to parse as JSON first
        if let Ok(lyric_response) = response.json::<KuwoLyricResponse>().await {
            let lyric = if let Some(lrclist) = lyric_response.lrclist {
                Self::lrclist_to_lrc(&lrclist)
            } else {
                String::new()
            };

            let tlyric = if let Some(lrclist_tlyric) = lyric_response.lrclist_tlyric {
                Some(Self::lrclist_to_lrc(&lrclist_tlyric))
            } else {
                None
            };

            Ok(LyricInfo { lyric, tlyric })
        } else {
            // If JSON parsing fails, return empty lyrics
            Ok(LyricInfo {
                lyric: String::new(),
                tlyric: None,
            })
        }
    }

    async fn get_playlist(
        &self,
        playlist_id: &str,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<MusicInfo>> {
        let url = format!(
            "http://nplserver.kuwo.cn/pl.svc?op=getlistinfo&pid={}&pn={}&rn={}&encode=utf-8&keyset=pl2012&identity=kuwo",
            playlist_id,
            page - 1,
            page_size
        );

        let response = self.client.get(&url).send().await?;
        let playlist_response: KuwoPlaylistResponse = response.json().await?;

        let mut music_list = Vec::new();

        if let Some(songs) = playlist_response.musiclist {
            for song in songs {
                let music_info = MusicInfo {
                    name: song.name,
                    singer: song.artist,
                    source: KUWO_SOURCE.to_string(),
                    songmid: song.rid.clone(),
                    album_id: song.albumid.unwrap_or_default(),
                    interval: Self::format_duration(song.duration),
                    album_name: song.album.unwrap_or_default(),
                    types: vec![],
                    img: song.albumpic,
                };

                music_list.push(music_info);
            }
        }

        Ok(music_list)
    }

    fn source_name(&self) -> &'static str {
        KUWO_SOURCE
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_duration() {
        assert_eq!(KuwoSource::format_duration(125), "02:05");
        assert_eq!(KuwoSource::format_duration(65), "01:05");
        assert_eq!(KuwoSource::format_duration(240), "04:00");
    }

    #[test]
    fn test_parse_quality_info() {
        let n_minfo = "level:lossless,bitrate:2000,format:flac,size:25.3M;level:standard,bitrate:128,format:mp3,size:3.2M";
        let types = KuwoSource::parse_quality_info(n_minfo);
        assert_eq!(types.len(), 2);
        assert_eq!(types[0].quality_type, "128k");
        assert_eq!(types[1].quality_type, "flac");
    }

    #[test]
    fn test_decode_html_entities() {
        assert_eq!(
            KuwoSource::decode_html_entities("Hello &amp; World"),
            "Hello & World"
        );
        assert_eq!(
            KuwoSource::decode_html_entities("&quot;Test&quot;"),
            "\"Test\""
        );
    }
}
