use super::helpers::{build_client, format_duration_millis, format_size};
use super::source::{
    LyricInfo, MusicInfo, MusicSource, MusicSourceError, Quality, QualityInfo, Result,
    SourcePlaylistDetail, SourcePlaylistSummary,
};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Deserializer};
use serde_json::json;

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
            song_id: None,
            msg_id: None,
            copyright_id: None,
            interval: format_duration_millis(song.duration),
            album_name: song.album.name,
            types,
            img: song.album.pic_url,
        }
    }

    async fn fetch_song_details_by_ids(&self, ids: &[i64]) -> Result<Vec<NeteaseSong>> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }

        let c_payload = ids
            .iter()
            .map(|id| json!({ "id": id, "v": 0 }))
            .collect::<Vec<_>>();
        let ids_payload = ids.to_vec();

        let response = self
            .client
            .post("https://music.163.com/api/v3/song/detail")
            .form(&[
                (
                    "c",
                    serde_json::to_string(&c_payload).unwrap_or_else(|_| "[]".to_string()),
                ),
                (
                    "ids",
                    serde_json::to_string(&ids_payload).unwrap_or_else(|_| "[]".to_string()),
                ),
            ])
            .send()
            .await?;
        let payload: NeteaseSongDetailResponse = response.json().await?;

        let mut song_map = payload
            .songs
            .into_iter()
            .map(|song| (song.id, song))
            .collect::<std::collections::HashMap<_, _>>();

        Ok(ids.iter().filter_map(|id| song_map.remove(id)).collect())
    }
}

fn deserialize_null_default<'de, D, T>(deserializer: D) -> std::result::Result<T, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de> + Default,
{
    Option::<T>::deserialize(deserializer).map(|value| value.unwrap_or_default())
}

fn default_string() -> String {
    String::new()
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

#[derive(Debug, Deserialize)]
struct NeteasePlaylistSearchResult {
    #[serde(default)]
    playlists: Vec<NeteasePlaylistItem>,
}

#[derive(Debug, Deserialize)]
struct NeteasePlaylistSearchResponse {
    result: Option<NeteasePlaylistSearchResult>,
}

#[derive(Debug, Deserialize, Clone)]
struct NeteaseSong {
    id: i64,
    #[serde(
        default = "default_string",
        deserialize_with = "deserialize_null_default"
    )]
    name: String,
    #[serde(
        default,
        deserialize_with = "deserialize_null_default",
        rename = "artists",
        alias = "ar"
    )]
    artists: Vec<NeteaseArtist>,
    #[serde(rename = "album", alias = "al")]
    album: NeteaseAlbum,
    #[serde(rename = "duration", alias = "dt")]
    duration: i64,
    #[serde(alias = "hMusic")]
    h: Option<NeteaseLevel>,
    #[serde(alias = "lMusic")]
    l: Option<NeteaseLevel>,
    #[serde(alias = "sqMusic")]
    sq: Option<NeteaseLevel>,
    #[serde(alias = "hrMusic")]
    hr: Option<NeteaseLevel>,
}

#[derive(Debug, Deserialize, Clone)]
struct NeteaseArtist {
    #[serde(
        default = "default_string",
        deserialize_with = "deserialize_null_default"
    )]
    name: String,
}

#[derive(Debug, Deserialize, Clone)]
struct NeteaseAlbum {
    id: i64,
    #[serde(
        default = "default_string",
        deserialize_with = "deserialize_null_default"
    )]
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
struct NeteaseSongDetailResponse {
    #[serde(default)]
    songs: Vec<NeteaseSong>,
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
    #[serde(default)]
    result: Option<NeteasePlaylist>,
    #[serde(default)]
    playlist: Option<NeteasePlaylist>,
}

#[derive(Debug, Deserialize)]
struct NeteasePlaylist {
    id: i64,
    name: String,
    #[serde(rename = "coverImgUrl")]
    cover_img_url: Option<String>,
    description: Option<String>,
    #[serde(rename = "trackCount")]
    track_count: Option<u32>,
    #[serde(rename = "playCount")]
    play_count: Option<u64>,
    #[serde(rename = "createTime")]
    create_time: Option<i64>,
    #[serde(rename = "updateTime")]
    update_time: Option<i64>,
    creator: Option<NeteasePlaylistCreator>,
    #[serde(
        default,
        deserialize_with = "deserialize_null_default",
        rename = "trackIds",
        alias = "topTrackIds"
    )]
    track_ids: Vec<NeteaseTrackId>,
    #[serde(default, deserialize_with = "deserialize_null_default")]
    tracks: Vec<NeteaseSong>,
}

#[derive(Debug, Deserialize, Clone)]
struct NeteaseTrackId {
    id: i64,
}

#[derive(Debug, Deserialize)]
struct NeteasePlaylistItem {
    id: i64,
    name: String,
    #[serde(rename = "coverImgUrl")]
    cover_img_url: Option<String>,
    description: Option<String>,
    #[serde(rename = "trackCount")]
    track_count: Option<u32>,
    #[serde(rename = "playCount")]
    play_count: Option<u64>,
    #[serde(rename = "createTime")]
    create_time: Option<i64>,
    #[serde(rename = "updateTime")]
    update_time: Option<i64>,
    creator: Option<NeteasePlaylistCreator>,
}

#[derive(Debug, Deserialize)]
struct NeteasePlaylistCreator {
    nickname: String,
}

impl NeteasePlaylistResponse {
    fn into_playlist(self) -> Option<NeteasePlaylist> {
        self.result.or(self.playlist)
    }
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
            .query(&[("id", song_id), ("lv", "-1"), ("kv", "-1"), ("tv", "-1")])
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
            .get("https://music.163.com/api/v3/playlist/detail")
            .header("Referer", "https://music.163.com/")
            .query(&[("id", playlist_id)])
            .send()
            .await?;
        let payload: NeteasePlaylistResponse = response.json().await?;
        let playlist = payload
            .into_playlist()
            .ok_or_else(|| MusicSourceError::PlaylistNotFound(playlist_id.to_string()))?;
        let total_tracks = if playlist.track_ids.is_empty() {
            playlist.tracks.len()
        } else {
            playlist.track_ids.len()
        };
        let start = ((page.saturating_sub(1)) * page_size) as usize;
        let end = (start + page_size as usize).min(total_tracks);
        if start >= total_tracks {
            return Ok(Vec::new());
        }

        if playlist.tracks.len() == total_tracks && total_tracks > 0 {
            return Ok(playlist.tracks[start..end]
                .iter()
                .cloned()
                .map(Self::map_song)
                .collect());
        }

        let track_ids = if playlist.track_ids.is_empty() {
            playlist
                .tracks
                .iter()
                .map(|song| song.id)
                .collect::<Vec<_>>()
        } else {
            playlist.track_ids[start..end]
                .iter()
                .map(|track| track.id)
                .collect::<Vec<_>>()
        };
        let songs = self.fetch_song_details_by_ids(&track_ids).await?;

        Ok(songs.into_iter().map(Self::map_song).collect())
    }

    async fn search_playlists(
        &self,
        keyword: &str,
        page: u32,
        page_size: u32,
    ) -> Result<Vec<SourcePlaylistSummary>> {
        let offset = (page.saturating_sub(1) * page_size) as usize;
        let url = format!(
            "https://music.163.com/api/search/get/web?type=1000&s={}&offset={}&limit={}",
            urlencoding::encode(keyword),
            offset,
            page_size
        );
        let response = self
            .client
            .get(url)
            .header("Referer", "https://music.163.com/")
            .send()
            .await?;
        let payload: NeteasePlaylistSearchResponse = response.json().await?;

        Ok(payload
            .result
            .map(|result| {
                result
                    .playlists
                    .into_iter()
                    .map(|playlist| SourcePlaylistSummary {
                        id: playlist.id.to_string(),
                        source: NETEASE_SOURCE.to_string(),
                        name: playlist.name,
                        cover: playlist.cover_img_url,
                        creator: playlist.creator.map(|creator| creator.nickname),
                        description: playlist.description,
                        track_count: playlist.track_count,
                        play_count: playlist.play_count,
                        created_at: playlist.create_time,
                        updated_at: playlist.update_time,
                    })
                    .collect()
            })
            .unwrap_or_default())
    }

    async fn get_playlist_detail(&self, playlist_id: &str) -> Result<SourcePlaylistDetail> {
        let response = self
            .client
            .get("https://music.163.com/api/v3/playlist/detail")
            .header("Referer", "https://music.163.com/")
            .query(&[("id", playlist_id)])
            .send()
            .await?;
        let payload: NeteasePlaylistResponse = response.json().await?;
        let playlist = payload
            .into_playlist()
            .ok_or_else(|| MusicSourceError::PlaylistNotFound(playlist_id.to_string()))?;

        Ok(SourcePlaylistDetail {
            id: playlist.id.to_string(),
            source: NETEASE_SOURCE.to_string(),
            name: playlist.name,
            cover: playlist.cover_img_url,
            creator: playlist.creator.map(|creator| creator.nickname),
            description: playlist.description,
            track_count: playlist.track_count,
            play_count: playlist.play_count,
            created_at: playlist.create_time,
            updated_at: playlist.update_time,
        })
    }

    fn source_name(&self) -> &'static str {
        NETEASE_SOURCE
    }
}
