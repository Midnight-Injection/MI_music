use super::helpers::{build_client, format_duration_seconds, format_size};
use super::source::{LyricInfo, MusicInfo, MusicSource, MusicSourceError, Quality, QualityInfo, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::Deserialize;

const QQ_SOURCE: &str = "tx";

pub struct QqSource {
    client: Client,
}

impl QqSource {
    pub fn new() -> Self {
        Self {
            client: build_client(),
        }
    }

    fn join_singers(singers: &[QqSinger]) -> String {
        singers
            .iter()
            .map(|singer| singer.name.clone())
            .collect::<Vec<_>>()
            .join(" / ")
    }

    fn build_cover(album_mid: &str, singers: &[QqSinger]) -> Option<String> {
        if !album_mid.is_empty() && album_mid != "空" {
            return Some(format!(
                "https://y.gtimg.cn/music/photo_new/T002R500x500M000{}.jpg",
                album_mid
            ));
        }
        let _ = singers;
        None
    }

    fn map_types(file: &QqFile) -> Vec<QualityInfo> {
        let mut types = Vec::new();
        if file.size_128mp3 > 0 {
            types.push(QualityInfo {
                quality_type: "128k".to_string(),
                size: format_size(file.size_128mp3 as u64),
            });
        }
        if file.size_320mp3 > 0 {
            types.push(QualityInfo {
                quality_type: "320k".to_string(),
                size: format_size(file.size_320mp3 as u64),
            });
        }
        if file.size_flac > 0 {
            types.push(QualityInfo {
                quality_type: "flac".to_string(),
                size: format_size(file.size_flac as u64),
            });
        }
        if file.size_hires > 0 {
            types.push(QualityInfo {
                quality_type: "flac24bit".to_string(),
                size: format_size(file.size_hires as u64),
            });
        }
        types
    }

    fn map_song(song: QqSongItem) -> MusicInfo {
        let album_name = song.album.as_ref().map(|album| album.name.clone()).unwrap_or_default();
        let album_mid = song.album.as_ref().map(|album| album.mid.clone()).unwrap_or_default();
        MusicInfo {
            name: format!("{}{}", song.name, song.title_extra.unwrap_or_default()),
            singer: Self::join_singers(&song.singer),
            source: QQ_SOURCE.to_string(),
            songmid: song.mid,
            album_id: album_mid.clone(),
            hash: None,
            str_media_mid: song.file.media_mid.clone().or(song.file.str_media_mid.clone()),
            copyright_id: None,
            interval: format_duration_seconds(song.interval),
            album_name,
            types: Self::map_types(&song.file),
            img: Self::build_cover(&album_mid, &song.singer),
        }
    }

    async fn fetch_song_detail(&self, songmid: &str) -> Result<MusicInfo> {
        let payload = serde_json::json!({
            "comm": { "ct": "19", "cv": "1859", "uin": "0" },
            "req": {
                "module": "music.pf_song_detail_svr",
                "method": "get_song_detail_yqq",
                "param": {
                    "song_type": 0,
                    "song_mid": songmid,
                }
            }
        });
        let response = self
            .client
            .post("https://u.y.qq.com/cgi-bin/musicu.fcg")
            .header("Referer", "https://y.qq.com/")
            .json(&payload)
            .send()
            .await?;
        let payload: QqSongDetailResponse = response.json().await?;
        if payload.code != 0 || payload.req.code != 0 {
            return Err(MusicSourceError::SongNotFound(songmid.to_string()));
        }
        Ok(Self::map_song(payload.req.data.track_info))
    }
}

impl Default for QqSource {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Deserialize)]
struct QqSearchResponse {
    code: i32,
    data: QqSearchData,
}

#[derive(Debug, Deserialize)]
struct QqSearchData {
    song: QqSearchSongList,
}

#[derive(Debug, Deserialize)]
struct QqSearchSongList {
    list: Vec<QqWebSongItem>,
}

#[derive(Debug, Deserialize)]
struct QqWebSongItem {
    #[serde(rename = "albummid")]
    album_mid: String,
    #[serde(rename = "albumname")]
    album_name: String,
    interval: i64,
    #[serde(default)]
    media_mid: Option<String>,
    #[serde(default, rename = "strMediaMid")]
    str_media_mid: Option<String>,
    singer: Vec<QqSinger>,
    #[serde(rename = "size128", default)]
    size_128mp3: i64,
    #[serde(rename = "size320", default)]
    size_320mp3: i64,
    #[serde(rename = "sizeflac", default)]
    size_flac: i64,
    #[serde(rename = "songmid")]
    song_mid: String,
    #[serde(rename = "songname")]
    song_name: String,
}

#[derive(Debug, Deserialize, Clone)]
struct QqSongItem {
    album: Option<QqAlbum>,
    file: QqFile,
    interval: i64,
    mid: String,
    name: String,
    singer: Vec<QqSinger>,
    #[serde(default)]
    title_extra: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
struct QqAlbum {
    mid: String,
    name: String,
}

#[derive(Debug, Deserialize, Clone)]
struct QqSinger {
    mid: String,
    name: String,
}

#[derive(Debug, Deserialize, Clone)]
struct QqFile {
    #[serde(default)]
    media_mid: Option<String>,
    #[serde(default)]
    str_media_mid: Option<String>,
    #[serde(default)]
    size_128mp3: i64,
    #[serde(default)]
    size_320mp3: i64,
    #[serde(default)]
    size_flac: i64,
    #[serde(default)]
    size_hires: i64,
}

#[derive(Debug, Deserialize)]
struct QqSongDetailResponse {
    code: i32,
    req: QqSongDetailData,
}

#[derive(Debug, Deserialize)]
struct QqSongDetailData {
    code: i32,
    data: QqSongDetailTrack,
}

#[derive(Debug, Deserialize)]
struct QqSongDetailTrack {
    track_info: QqSongItem,
}

#[derive(Debug, Deserialize)]
struct QqVkeyResponse {
    req_0: QqVkeyData,
}

#[derive(Debug, Deserialize)]
struct QqVkeyData {
    data: QqVkeyPayload,
}

#[derive(Debug, Deserialize)]
struct QqVkeyPayload {
    sip: Vec<String>,
    midurlinfo: Vec<QqMidUrlInfo>,
}

#[derive(Debug, Deserialize)]
struct QqMidUrlInfo {
    purl: String,
}

#[derive(Debug, Deserialize)]
struct QqMobileSearchResponse {
    code: i32,
    req: QqMobileSearchReq,
}

#[derive(Debug, Deserialize)]
struct QqMobileSearchReq {
    code: i32,
    data: QqMobileSearchData,
}

#[derive(Debug, Deserialize)]
struct QqMobileSearchData {
    body: QqMobileSearchBody,
}

#[derive(Debug, Deserialize)]
struct QqMobileSearchBody {
    #[serde(default)]
    item_song: Vec<QqMobileSongItem>,
}

#[derive(Debug, Deserialize)]
struct QqMobileSongItem {
    mid: String,
    #[serde(default)]
    href3: Option<String>,
}

#[derive(Debug, Deserialize)]
struct QqLyricResponse {
    code: i32,
    lyric: Option<String>,
    trans: Option<String>,
}

#[derive(Debug, Deserialize)]
struct QqPlaylistResponse {
    code: i32,
    cdlist: Vec<QqPlaylist>,
}

#[derive(Debug, Deserialize)]
struct QqPlaylist {
    songlist: Vec<QqSongItem>,
}

#[async_trait]
impl MusicSource for QqSource {
    async fn search(&self, keyword: &str, page: u32, page_size: u32) -> Result<Vec<MusicInfo>> {
        let url = format!(
            "https://shc.y.qq.com/soso/fcgi-bin/client_search_cp?ct=24&qqmusic_ver=1298&remoteplace=txt.yqq.top&aggr=1&cr=1&catZhida=1&lossless=0&flag_qc=0&p={}&n={}&w={}&cv=4747474&format=json&inCharset=utf-8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0&uin=0&hostUin=0&loginUin=0",
            page,
            page_size,
            urlencoding::encode(keyword)
        );
        let response = self
            .client
            .get(url)
            .header("Referer", "https://y.qq.com/portal/search.html")
            .send()
            .await?;
        let payload: QqSearchResponse = response.json().await?;
        if payload.code != 0 {
            return Err(MusicSourceError::Unknown("QQ search failed".to_string()));
        }
        Ok(payload
            .data
            .song
            .list
            .into_iter()
            .filter(|item| item.media_mid.is_some() || item.str_media_mid.is_some())
            .map(|item| MusicInfo {
                name: item.song_name,
                singer: Self::join_singers(&item.singer),
                source: QQ_SOURCE.to_string(),
                songmid: item.song_mid,
                album_id: item.album_mid.clone(),
                hash: None,
                str_media_mid: item.media_mid.or(item.str_media_mid),
                copyright_id: None,
                interval: format_duration_seconds(item.interval),
                album_name: item.album_name,
                types: {
                    let file = QqFile {
                        media_mid: None,
                        str_media_mid: None,
                        size_128mp3: item.size_128mp3,
                        size_320mp3: item.size_320mp3,
                        size_flac: item.size_flac,
                        size_hires: 0,
                    };
                    Self::map_types(&file)
                },
                img: Self::build_cover(&item.album_mid, &item.singer),
            })
            .collect())
    }

    async fn get_song_url(&self, song_id: &str, quality: Quality) -> Result<String> {
        let song = self.fetch_song_detail(song_id).await?;
        let media_mid = song
            .str_media_mid
            .clone()
            .ok_or_else(|| MusicSourceError::SongNotFound(song_id.to_string()))?;
        let (prefix, suffix) = match quality {
            Quality::Standard => ("M500", ".mp3"),
            Quality::High => ("M800", ".mp3"),
            Quality::Lossless => ("F000", ".flac"),
            Quality::Lossless24Bit => ("F000", ".flac"),
        };
        let filename = format!("{}{}{}", prefix, media_mid, suffix);
        let payload = serde_json::json!({
            "req_0": {
                "module": "vkey.GetVkeyServer",
                "method": "CgiGetVkey",
                "param": {
                    "filename": [filename],
                    "guid": "10000",
                    "songmid": [song.songmid],
                    "songtype": [0],
                    "uin": "0",
                    "loginflag": 1,
                    "platform": "20"
                }
            },
            "loginUin": "0",
            "comm": {
                "uin": "0",
                "format": "json",
                "ct": 24,
                "cv": 0
            }
        });
        let response = self
            .client
            .post("https://u.y.qq.com/cgi-bin/musicu.fcg")
            .header("Referer", "https://y.qq.com/")
            .json(&payload)
            .send()
            .await?;
        let payload: QqVkeyResponse = response.json().await?;
        let purl = payload
            .req_0
            .data
            .midurlinfo
            .first()
            .map(|item| item.purl.clone())
            .unwrap_or_default();
        if purl.is_empty() {
            let keyword = format!("{} {}", song.name, song.singer);
            let payload = serde_json::json!({
                "comm": {
                    "ct": "11",
                    "cv": "14090508",
                    "v": "14090508",
                    "tmeAppID": "qqmusic",
                    "phonetype": "EBG-AN10",
                    "deviceScore": "553.47",
                    "devicelevel": "50",
                    "newdevicelevel": "20",
                    "rom": "HuaWei/EMOTION/EmotionUI_14.2.0",
                    "os_ver": "12",
                    "OpenUDID": "0",
                    "OpenUDID2": "0",
                    "QIMEI36": "0",
                    "udid": "0",
                    "chid": "0",
                    "aid": "0",
                    "oaid": "0",
                    "taid": "0",
                    "tid": "0",
                    "wid": "0",
                    "uid": "0",
                    "sid": "0",
                    "modeSwitch": "6",
                    "teenMode": "0",
                    "ui_mode": "2",
                    "nettype": "1020",
                    "v4ip": ""
                },
                "req": {
                    "module": "music.search.SearchCgiService",
                    "method": "DoSearchForQQMusicMobile",
                    "param": {
                        "search_type": 0,
                        "query": keyword,
                        "page_num": 1,
                        "num_per_page": 5,
                        "highlight": 0,
                        "nqc_flag": 0,
                        "multi_zhida": 0,
                        "cat": 2,
                        "grp": 1,
                        "sin": 0,
                        "sem": 0
                    }
                }
            });
            let preview_response = self
                .client
                .post("https://u.y.qq.com/cgi-bin/musicu.fcg")
                .header("User-Agent", "QQMusic 14090508(android 12)")
                .header("Referer", "https://y.qq.com/")
                .json(&payload)
                .send()
                .await?;
            let preview_payload: QqMobileSearchResponse = preview_response.json().await?;
            if preview_payload.code == 0 && preview_payload.req.code == 0 {
                if let Some(preview_url) = preview_payload
                    .req
                    .data
                    .body
                    .item_song
                    .into_iter()
                    .find(|item| item.mid == song_id)
                    .and_then(|item| item.href3)
                    .filter(|url| !url.is_empty())
                {
                    return Ok(preview_url);
                }
            }
            return Err(MusicSourceError::SongNotFound(song_id.to_string()));
        }
        let prefix = payload
            .req_0
            .data
            .sip
            .first()
            .cloned()
            .unwrap_or_else(|| "http://aqqmusic.tc.qq.com/".to_string());
        Ok(format!("{}{}", prefix, purl))
    }

    async fn get_lyric(&self, song_id: &str) -> Result<LyricInfo> {
        let url = format!(
            "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid={}&format=json&nobase64=1",
            song_id
        );
        let response = self
            .client
            .get(url)
            .header("Referer", "https://y.qq.com/")
            .send()
            .await?;
        let payload: QqLyricResponse = response.json().await?;
        if payload.code != 0 {
            return Err(MusicSourceError::LyricsNotFound(song_id.to_string()));
        }
        Ok(LyricInfo {
            lyric: payload
                .lyric
                .ok_or_else(|| MusicSourceError::LyricsNotFound(song_id.to_string()))?,
            tlyric: payload.trans,
        })
    }

    async fn get_playlist(
        &self,
        playlist_id: &str,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<MusicInfo>> {
        let url = format!(
            "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&utf8=1&onlysong=0&disstid={}&format=json",
            playlist_id
        );
        let response = self
            .client
            .get(url)
            .header("Referer", "https://y.qq.com/")
            .send()
            .await?;
        let payload: QqPlaylistResponse = response.json().await?;
        if payload.code != 0 || payload.cdlist.is_empty() {
            return Err(MusicSourceError::PlaylistNotFound(playlist_id.to_string()));
        }
        let songs = &payload.cdlist[0].songlist;
        let start = ((page.saturating_sub(1)) * page_size) as usize;
        let end = (start + page_size as usize).min(songs.len());
        if start >= songs.len() {
            return Ok(Vec::new());
        }
        Ok(songs[start..end]
            .iter()
            .cloned()
            .map(Self::map_song)
            .collect())
    }

    fn source_name(&self) -> &'static str {
        QQ_SOURCE
    }
}
