use super::helpers::{build_client, decode_html, format_duration_millis, format_size};
use super::source::{LyricInfo, MusicInfo, MusicSource, MusicSourceError, Quality, QualityInfo, Result};
use async_trait::async_trait;
use md5;
use regex::Regex;
use reqwest::Client;
use serde::Deserialize;
use std::collections::BTreeMap;

const KUGOU_SOURCE: &str = "kg";

pub struct KugouSource {
    client: Client,
}

impl KugouSource {
    pub fn new() -> Self {
        Self {
            client: build_client(),
        }
    }

    fn normalize_cover_url(url: &str) -> String {
        if let Some(rest) = url.strip_prefix("http://") {
            return format!("https://{}", rest);
        }
        url.to_string()
    }

    fn parse_types(song: &KugouSongItem) -> Vec<QualityInfo> {
        let mut types = Vec::new();
        if song.file_size > 0 {
            types.push(QualityInfo {
                quality_type: "128k".to_string(),
                size: format_size(song.file_size),
            });
        }
        if song.hq_file_size > 0 {
            types.push(QualityInfo {
                quality_type: "320k".to_string(),
                size: format_size(song.hq_file_size),
            });
        }
        if song.sq_file_size > 0 {
            types.push(QualityInfo {
                quality_type: "flac".to_string(),
                size: format_size(song.sq_file_size),
            });
        }
        if song.res_file_size > 0 {
            types.push(QualityInfo {
                quality_type: "flac24bit".to_string(),
                size: format_size(song.res_file_size),
            });
        }
        types
    }

    fn map_song(song: KugouSongItem) -> MusicInfo {
        let types = Self::parse_types(&song);
        let img = song
            .image
            .clone()
            .map(|img| Self::normalize_cover_url(&img.replace("{size}", "240")));
        let hash = song.file_hash.clone();
        MusicInfo {
            name: decode_html(&song.song_name),
            singer: decode_html(&song.singer_name),
            source: KUGOU_SOURCE.to_string(),
            songmid: song.audio_id.to_string(),
            album_id: song.album_id,
            hash: Some(hash),
            str_media_mid: None,
            copyright_id: None,
            interval: format_duration_millis(song.duration),
            album_name: decode_html(&song.album_name),
            types,
            img,
        }
    }

    async fn lookup_song_by_hash(&self, hash: &str) -> Result<KugouAudioInfoItem> {
        let response = self
            .client
            .post("http://gateway.kugou.com/v3/album_audio/audio")
            .header("KG-THash", "13a3164")
            .header("KG-RC", "1")
            .header("KG-Fake", "0")
            .header("KG-RF", "00869891")
            .header(
                "User-Agent",
                "Android712-AndroidPhone-11451-376-0-FeeCacheUpdate-wifi",
            )
            .header("x-router", "kmr.service.kugou.com")
            .form(&[
                ("area_code", "1"),
                ("show_privilege", "1"),
                ("show_album_info", "1"),
                ("is_publish", ""),
                ("appid", "1005"),
                ("clientver", "11451"),
                ("mid", "1"),
                ("dfid", "-"),
                ("clienttime", "0"),
                ("key", "OIlwieks28dk2k092lksi2UIkp"),
                (
                    "fields",
                    "album_info,author_name,audio_info,ori_audio_name,base,songname,classification",
                ),
                ("data", hash),
            ])
            .send()
            .await?;

        let value: serde_json::Value = response.json().await?;
        let entry = value
            .as_array()
            .and_then(|items| items.first())
            .and_then(|items| items.as_array())
            .and_then(|items| items.first())
            .ok_or_else(|| MusicSourceError::SongNotFound(hash.to_string()))?;

        serde_json::from_value(entry.clone()).map_err(MusicSourceError::from)
    }

    pub async fn get_song_url_by_hash_and_album(
        &self,
        hash: &str,
        album_id: &str,
        _quality: Quality,
    ) -> Result<String> {
        let client_time = chrono::Utc::now().timestamp().to_string();
        let key = format!(
            "{:x}",
            md5::compute(format!("{hash}57ae12eb6890223e355ccfcb74edf70d10051234560"))
        );

        let mut params = BTreeMap::new();
        params.insert("album_audio_id", "0".to_string());
        params.insert("album_id", album_id.to_string());
        params.insert("appid", "1005".to_string());
        params.insert("area_code", "1".to_string());
        params.insert("auth", "".to_string());
        params.insert("behavior", "play".to_string());
        params.insert("clienttime", client_time);
        params.insert("clientver", "10086".to_string());
        params.insert("dfid", "-".to_string());
        params.insert("hash", hash.to_string());
        params.insert("key", key);
        params.insert("mid", "123456".to_string());
        params.insert("module", "".to_string());
        params.insert("mtype", "0".to_string());
        params.insert("pid", "2".to_string());
        params.insert("pidversion", "3001".to_string());
        params.insert("ptype", "0".to_string());
        params.insert("quality", "128".to_string());
        params.insert("ssa_flag", "is_fromtrack".to_string());
        params.insert("token", "".to_string());
        params.insert("userid", "0".to_string());
        params.insert("vipType", "6".to_string());

        let signature_source = params
            .iter()
            .map(|(key, value)| format!("{key}={value}"))
            .collect::<String>();
        let signature = format!(
            "{:x}",
            md5::compute(format!(
                "OIlwieks28dk2k092lksi2UIkp{signature_source}OIlwieks28dk2k092lksi2UIkp"
            ))
        );

        let response = self
            .client
            .get("https://gateway.kugou.com/v5/url")
            .header(
                "User-Agent",
                "Android712-AndroidPhone-8983-18-0-NetMusic-wifi",
            )
            .header("KG-THash", "3e5ec6b")
            .header("KG-Rec", "1")
            .header("KG-RC", "1")
            .header("x-router", "tracker.kugou.com")
            .query(
                &params
                    .iter()
                    .map(|(key, value)| (*key, value.as_str()))
                    .collect::<Vec<_>>(),
            )
            .query(&[("signature", signature.as_str())])
            .send()
            .await?;

        let payload: serde_json::Value = response.json().await?;
        if payload
            .get("status")
            .and_then(|value| value.as_i64())
            .unwrap_or_default()
            != 1
        {
            return Err(MusicSourceError::Unknown(
                payload
                    .get("err_code")
                    .and_then(|value| value.as_str())
                    .unwrap_or("Kugou play failed")
                    .to_string(),
            ));
        }

        payload
            .get("url")
            .and_then(|value| value.as_array())
            .and_then(|items| items.first())
            .and_then(|value| value.as_str())
            .filter(|value| !value.is_empty())
            .map(|value| value.to_string())
            .ok_or_else(|| MusicSourceError::SongNotFound(hash.to_string()))
    }
}

impl Default for KugouSource {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Deserialize)]
struct KugouSearchResponse {
    error_code: i32,
    data: KugouSearchData,
}

#[derive(Debug, Deserialize)]
struct KugouSearchData {
    total: u64,
    lists: Vec<KugouSongItem>,
}

#[derive(Debug, Deserialize, Clone)]
struct KugouSongItem {
    #[serde(rename = "Audioid")]
    audio_id: u64,
    #[serde(rename = "AlbumID")]
    album_id: String,
    #[serde(rename = "AlbumName")]
    album_name: String,
    #[serde(rename = "Duration")]
    duration: i64,
    #[serde(rename = "FileHash")]
    file_hash: String,
    #[serde(rename = "FileSize")]
    file_size: u64,
    #[serde(rename = "HQFileSize")]
    hq_file_size: u64,
    #[serde(rename = "Image")]
    image: Option<String>,
    #[serde(rename = "ResFileSize")]
    res_file_size: u64,
    #[serde(rename = "SQFileSize")]
    sq_file_size: u64,
    #[serde(rename = "SingerName")]
    singer_name: String,
    #[serde(rename = "SongName")]
    song_name: String,
}

#[derive(Debug, Deserialize)]
struct KugouAudioInfoItem {
    album_info: KugouAlbumInfo,
    audio_info: KugouAudioInfo,
}

#[derive(Debug, Deserialize)]
struct KugouAlbumInfo {
    album_id: String,
}

#[derive(Debug, Deserialize)]
struct KugouAudioInfo {
    hash: String,
}

#[derive(Debug, Deserialize)]
struct KugouPlayResponse {
    status: i32,
    err_code: Option<String>,
    data: KugouPlayData,
}

#[derive(Debug, Deserialize)]
struct KugouPlayData {
    play_url: Option<String>,
    play_backup_url: Option<String>,
}

#[async_trait]
impl MusicSource for KugouSource {
    async fn search(&self, keyword: &str, page: u32, page_size: u32) -> Result<Vec<MusicInfo>> {
        let url = format!(
            "https://songsearch.kugou.com/song_search_v2?keyword={}&page={}&pagesize={}&userid=0&clientver=&platform=WebFilter&filter=2&iscorrection=1&privilege_filter=0&area_code=1",
            urlencoding::encode(keyword),
            page,
            page_size
        );
        let response = self.client.get(url).send().await?;
        let payload: KugouSearchResponse = response.json().await?;
        if payload.error_code != 0 {
            return Err(MusicSourceError::Unknown(format!(
                "Kugou search failed: {}",
                payload.error_code
            )));
        }
        let _ = payload.data.total;
        Ok(payload
            .data
            .lists
            .into_iter()
            .map(Self::map_song)
            .collect())
    }

    async fn get_song_url(&self, song_id: &str, _quality: Quality) -> Result<String> {
        let info = self.lookup_song_by_hash(song_id).await?;
        let response = self
            .client
            .get("https://wwwapi.kugou.com/yy/index.php")
            .query(&[
                ("r", "play/getdata"),
                ("hash", info.audio_info.hash.as_str()),
                ("platid", "4"),
                ("album_id", info.album_info.album_id.as_str()),
                ("mid", "00000000000000000000000000000000"),
            ])
            .send()
            .await?;
        let payload: KugouPlayResponse = response.json().await?;
        if payload.status != 1 {
            return Err(MusicSourceError::Unknown(
                payload.err_code.unwrap_or_else(|| "Kugou play failed".to_string()),
            ));
        }
        payload
            .data
            .play_url
            .or(payload.data.play_backup_url)
            .filter(|url| !url.is_empty())
            .ok_or_else(|| MusicSourceError::SongNotFound(song_id.to_string()))
    }

    async fn get_lyric(&self, song_id: &str) -> Result<LyricInfo> {
        let url = format!(
            "http://m.kugou.com/app/i/krc.php?cmd=100&hash={}&timelength=0",
            song_id
        );
        let lyric = self.client.get(url).send().await?.text().await?;
        if lyric.trim().is_empty() {
            return Err(MusicSourceError::LyricsNotFound(song_id.to_string()));
        }
        Ok(LyricInfo {
            lyric,
            tlyric: None,
        })
    }

    async fn get_playlist(
        &self,
        playlist_id: &str,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<MusicInfo>> {
        let url = format!(
            "http://www2.kugou.kugou.com/yueku/v9/special/single/{}-5-9999.html",
            playlist_id
        );
        let body = self.client.get(url).send().await?.text().await?;
        let regex = Regex::new(r"global\.data = (\[.+\]);").unwrap();
        let json = regex
            .captures(&body)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str())
            .ok_or_else(|| MusicSourceError::PlaylistNotFound(playlist_id.to_string()))?;
        let values: Vec<serde_json::Value> = serde_json::from_str(json)?;

        let start = ((page.saturating_sub(1)) * page_size) as usize;
        let end = (start + page_size as usize).min(values.len());
        if start >= values.len() {
            return Ok(Vec::new());
        }

        let list = values[start..end]
            .iter()
            .filter_map(|item| {
                let name = item.get("songname")?.as_str()?.to_string();
                let singer = item.get("singername")?.as_str()?.to_string();
                let hash = item.get("hash")?.as_str()?.to_string();
                let album_name = item
                    .get("album_name")
                    .and_then(|value| value.as_str())
                    .unwrap_or_default()
                    .to_string();
                let album_id = item
                    .get("album_id")
                    .and_then(|value| value.as_i64())
                    .unwrap_or_default()
                    .to_string();
                let duration = item
                    .get("duration")
                    .and_then(|value| value.as_i64())
                    .unwrap_or_default();
                Some(MusicInfo {
                    name: decode_html(&name),
                    singer: decode_html(&singer),
                    source: KUGOU_SOURCE.to_string(),
                    songmid: item
                        .get("audio_id")
                        .and_then(|value| value.as_i64())
                        .unwrap_or_default()
                        .to_string(),
                    album_id,
                    hash: Some(hash),
                    str_media_mid: None,
                    copyright_id: None,
                    interval: format_duration_millis(duration),
                    album_name: decode_html(&album_name),
                    types: Vec::new(),
                    img: item
                        .get("trans_param")
                        .and_then(|value| value.get("union_cover"))
                        .and_then(|value| value.as_str())
                        .map(|img| Self::normalize_cover_url(&img.replace("{size}", "240"))),
                })
            })
            .collect();

        Ok(list)
    }

    fn source_name(&self) -> &'static str {
        KUGOU_SOURCE
    }
}
