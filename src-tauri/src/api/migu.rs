use super::helpers::{build_client, format_duration_seconds, format_size};
use super::source::{LyricInfo, MusicInfo, MusicSource, MusicSourceError, Quality, QualityInfo, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::Deserialize;

const MIGU_SOURCE: &str = "mg";

pub struct MiguSource {
    client: Client,
}

impl MiguSource {
    pub fn new() -> Self {
        Self {
            client: build_client(),
        }
    }

    fn map_img(song: &MiguSongItem) -> Option<String> {
        song.img_items
            .as_ref()
            .and_then(|items| items.first())
            .map(|item| item.img.clone())
            .or_else(|| {
                song.img3
                    .clone()
                    .or(song.img2.clone())
                    .or(song.img1.clone())
                    .map(|img| {
                        if img.starts_with("http") {
                            img
                        } else {
                            format!("https://d.musicapp.migu.cn{}", img)
                        }
                    })
            })
    }

    fn map_types_from_rate_formats(rate_formats: &[MiguRateFormat]) -> Vec<QualityInfo> {
        let mut types = Vec::new();
        for format in rate_formats {
            let quality_type = match format.format_type.as_str() {
                "PQ" => "128k",
                "HQ" => "320k",
                "SQ" => "flac",
                "ZQ" | "ZQ24" => "flac24bit",
                _ => continue,
            };
            let size = format
                .size
                .as_ref()
                .or(format.asize.as_ref())
                .or(format.isize.as_ref())
                .and_then(|value| value.parse::<u64>().ok())
                .map(format_size)
                .unwrap_or_default();
            types.push(QualityInfo {
                quality_type: quality_type.to_string(),
                size,
            });
        }
        types
    }

    fn map_song(song: MiguSongItem) -> MusicInfo {
        let img = Self::map_img(&song);
        let singer = song
            .singers
            .as_ref()
            .map(|items| {
                items.iter()
                    .map(|item| item.name.clone())
                    .collect::<Vec<_>>()
                    .join(" / ")
            })
            .or_else(|| {
                song.singer_list.as_ref().map(|items| {
                    items.iter()
                        .map(|item| item.name.clone())
                        .collect::<Vec<_>>()
                        .join(" / ")
                })
            })
            .unwrap_or_default();
        let album = song
            .albums
            .as_ref()
            .and_then(|items| items.first())
            .map(|item| item.name.clone())
            .unwrap_or_else(|| song.album.unwrap_or_default());
        let album_id = song
            .albums
            .as_ref()
            .and_then(|items| items.first())
            .map(|item| item.id.clone())
            .unwrap_or_else(|| song.album_id.unwrap_or_default());
        let interval = song
            .duration
            .map(format_duration_seconds)
            .unwrap_or_else(|| song.length.unwrap_or_else(|| "00:00".to_string()));
        let rate_formats = song
            .rate_formats
            .clone()
            .or(song.audio_formats.clone())
            .unwrap_or_default();
        let copyright_id = song.copyright_id.clone();

        MusicInfo {
            name: song.name,
            singer,
            source: MIGU_SOURCE.to_string(),
            songmid: song.id.or(song.song_id).unwrap_or_default(),
            album_id,
            hash: None,
            str_media_mid: None,
            copyright_id,
            interval,
            album_name: album,
            types: Self::map_types_from_rate_formats(&rate_formats),
            img,
        }
    }

    async fn get_music_info(&self, song_id: &str) -> Result<MiguResourceInfoItem> {
        let response = self
            .client
            .post("https://c.musicapp.migu.cn/MIGUM2.0/v1.0/content/resourceinfo.do?resourceType=2")
            .form(&[("resourceId", song_id)])
            .send()
            .await?;
        let payload: MiguResourceInfoResponse = response.json().await?;
        payload
            .resource
            .into_iter()
            .next()
            .ok_or_else(|| MusicSourceError::SongNotFound(song_id.to_string()))
    }
}

impl Default for MiguSource {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Deserialize)]
struct MiguSearchResponse {
    code: String,
    #[serde(rename = "songResultData")]
    song_result_data: Option<MiguSearchData>,
}

#[derive(Debug, Deserialize)]
struct MiguSearchData {
    #[serde(rename = "result")]
    result: Vec<MiguSongItem>,
}

#[derive(Debug, Deserialize, Clone)]
struct MiguSongItem {
    id: Option<String>,
    #[serde(rename = "songId")]
    song_id: Option<String>,
    name: String,
    #[serde(rename = "copyrightId")]
    copyright_id: Option<String>,
    duration: Option<i64>,
    length: Option<String>,
    #[serde(default)]
    albums: Option<Vec<MiguAlbum>>,
    album: Option<String>,
    #[serde(rename = "albumId")]
    album_id: Option<String>,
    #[serde(default)]
    singers: Option<Vec<MiguSinger>>,
    #[serde(rename = "singerList")]
    singer_list: Option<Vec<MiguSinger>>,
    #[serde(rename = "imgItems")]
    img_items: Option<Vec<MiguImgItem>>,
    img1: Option<String>,
    img2: Option<String>,
    img3: Option<String>,
    #[serde(rename = "rateFormats")]
    rate_formats: Option<Vec<MiguRateFormat>>,
    #[serde(rename = "audioFormats")]
    audio_formats: Option<Vec<MiguRateFormat>>,
}

#[derive(Debug, Deserialize, Clone)]
struct MiguSinger {
    name: String,
}

#[derive(Debug, Deserialize, Clone)]
struct MiguAlbum {
    id: String,
    name: String,
}

#[derive(Debug, Deserialize, Clone)]
struct MiguImgItem {
    img: String,
}

#[derive(Debug, Deserialize, Clone)]
struct MiguRateFormat {
    #[serde(rename = "formatType")]
    format_type: String,
    size: Option<String>,
    asize: Option<String>,
    isize: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MiguResourceInfoResponse {
    resource: Vec<MiguResourceInfoItem>,
}

#[derive(Debug, Deserialize)]
struct MiguResourceInfoItem {
    #[serde(rename = "lrcUrl")]
    lrc_url: Option<String>,
    #[serde(rename = "trcUrl")]
    trc_url: Option<String>,
    #[serde(rename = "mrcUrl")]
    mrc_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MiguPlaylistInfoResponse {
    code: String,
    data: MiguPlaylistInfo,
}

#[derive(Debug, Deserialize)]
struct MiguPlaylistInfo {
    title: String,
}

#[derive(Debug, Deserialize)]
struct MiguPlaylistSongsResponse {
    code: String,
    data: MiguPlaylistSongsData,
}

#[derive(Debug, Deserialize)]
struct MiguPlaylistSongsData {
    #[serde(rename = "songList")]
    song_list: Vec<MiguSongItem>,
}

#[derive(Debug, Deserialize)]
struct MiguListenUrlResponse {
    code: String,
    data: Option<MiguListenUrlData>,
}

#[derive(Debug, Deserialize)]
struct MiguListenUrlData {
    url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MiguLegacyListenUrlResponse {
    code: String,
    data: Option<MiguLegacyListenUrlData>,
}

#[derive(Debug, Deserialize)]
struct MiguLegacyListenUrlData {
    url: Option<String>,
}

#[async_trait]
impl MusicSource for MiguSource {
    async fn search(&self, keyword: &str, page: u32, page_size: u32) -> Result<Vec<MusicInfo>> {
        let url = format!(
            "https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/search_all.do?text={}&pageNo={}&pageSize={}&searchSwitch=%7B%22song%22%3A1%7D",
            urlencoding::encode(keyword),
            page,
            page_size
        );
        let response = self.client.get(url).send().await?;
        let payload: MiguSearchResponse = response.json().await?;
        if payload.code != "000000" {
            return Err(MusicSourceError::Unknown("Migu search failed".to_string()));
        }
        Ok(payload
            .song_result_data
            .map(|data| data.result.into_iter().map(Self::map_song).collect())
            .unwrap_or_default())
    }

    async fn get_song_url(&self, song_id: &str, quality: Quality) -> Result<String> {
        let tone_flag = match quality {
            Quality::Standard => "PQ",
            Quality::High => "HQ",
            Quality::Lossless => "SQ",
            Quality::Lossless24Bit => "ZQ",
        };
        let new_api_url = format!(
            "https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2?netType=01&resourceType=E&songId={}&toneFlag={}",
            song_id, tone_flag
        );
        let response = self
            .client
            .get(new_api_url)
            .header("channel", "0146951")
            .header("uid", "0")
            .send()
            .await?;
        let payload: MiguListenUrlResponse = response.json().await?;
        let play_url = payload
            .data
            .and_then(|data| data.url)
            .map(|url| {
                if url.starts_with("//") {
                    format!("https:{}", url)
                } else {
                    url
                }
            })
            .map(|url| url.replace('+', "%2B"))
            .and_then(|url| url.split('?').next().map(|value| value.to_string()));
        if let Some(url) = play_url {
            return Ok(url);
        }

        let legacy_tone_flag = match quality {
            Quality::Standard => "PQ",
            _ => "PQ",
        };
        let legacy_url = format!(
            "https://app.c.nf.migu.cn/MIGUM2.0/v2.0/content/listen-url?netType=00&resourceType=2&songId={}&toneFlag={}",
            song_id, legacy_tone_flag
        );
        let legacy_response = self
            .client
            .get(legacy_url)
            .header("channel", "0146921")
            .send()
            .await?;
        let legacy_payload: MiguLegacyListenUrlResponse = legacy_response.json().await?;
        legacy_payload
            .data
            .and_then(|data| data.url)
            .map(|url| url.replace('+', "%2B"))
            .ok_or_else(|| {
                MusicSourceError::Unknown(format!(
                    "Migu playback unavailable for {} ({}/{})",
                    song_id, payload.code, legacy_payload.code
                ))
            })
    }

    async fn get_lyric(&self, song_id: &str) -> Result<LyricInfo> {
        let info = self.get_music_info(song_id).await?;
        let lyric_url = info
            .lrc_url
            .or(info.mrc_url)
            .ok_or_else(|| MusicSourceError::LyricsNotFound(song_id.to_string()))?;
        let lyric = self.client.get(lyric_url).send().await?.text().await?;
        let tlyric = match info.trc_url {
            Some(url) if !url.is_empty() => Some(self.client.get(url).send().await?.text().await?),
            _ => None,
        };
        Ok(LyricInfo { lyric, tlyric })
    }

    async fn get_playlist(
        &self,
        playlist_id: &str,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<MusicInfo>> {
        let info_url = format!(
            "https://app.c.nf.migu.cn/MIGUM3.0/resource/playlist/v2.0?playlistId={}",
            playlist_id
        );
        let songs_url = format!(
            "https://app.c.nf.migu.cn/MIGUM3.0/resource/playlist/song/v2.0?pageNo={}&pageSize={}&playlistId={}",
            page, page_size, playlist_id
        );
        let _info: MiguPlaylistInfoResponse = self.client.get(info_url).send().await?.json().await?;
        let payload: MiguPlaylistSongsResponse = self.client.get(songs_url).send().await?.json().await?;
        if payload.code != "000000" {
            return Err(MusicSourceError::PlaylistNotFound(playlist_id.to_string()));
        }
        Ok(payload
            .data
            .song_list
            .into_iter()
            .map(Self::map_song)
            .collect())
    }

    fn source_name(&self) -> &'static str {
        MIGU_SOURCE
    }
}
