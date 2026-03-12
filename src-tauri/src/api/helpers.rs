use reqwest::Client;
use std::time::Duration;
use url::Url;

pub fn build_client() -> Client {
    Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        .connect_timeout(Duration::from_secs(8))
        .timeout(Duration::from_secs(15))
        .build()
        .unwrap()
}

pub fn build_media_client() -> Client {
    Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        .connect_timeout(Duration::from_secs(8))
        .timeout(Duration::from_secs(90))
        .build()
        .unwrap()
}

pub fn apply_media_request_headers(
    request: reqwest::RequestBuilder,
    url: &str,
) -> reqwest::RequestBuilder {
    let mut request = request.header(
        reqwest::header::ACCEPT,
        "audio/*,*/*;q=0.9,application/octet-stream;q=0.8",
    );

    let Some(parsed) = Url::parse(url).ok() else {
        return request;
    };

    let host = parsed.host_str().unwrap_or_default();
    if host.contains("qq.com") || host.contains("gtimg.cn") {
        request = request
            .header(reqwest::header::REFERER, "https://y.qq.com/")
            .header(reqwest::header::ORIGIN, "https://y.qq.com");
    } else if host.contains("kugou.com") {
        request = request
            .header(reqwest::header::REFERER, "https://www.kugou.com/")
            .header(reqwest::header::ORIGIN, "https://www.kugou.com");
    } else if host.contains("migu.cn") {
        request = request
            .header(reqwest::header::REFERER, "https://music.migu.cn/")
            .header(reqwest::header::ORIGIN, "https://music.migu.cn");
    }

    request
}

pub fn format_duration_seconds(seconds: i64) -> String {
    let mins = seconds / 60;
    let secs = seconds % 60;
    format!("{:02}:{:02}", mins, secs)
}

pub fn format_duration_millis(millis: i64) -> String {
    format_duration_seconds(millis / 1000)
}

pub fn format_size(size: u64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;

    let size = size as f64;
    if size >= GB {
        format!("{:.2}GB", size / GB)
    } else if size >= MB {
        format!("{:.2}MB", size / MB)
    } else if size >= KB {
        format!("{:.2}KB", size / KB)
    } else {
        format!("{}B", size as u64)
    }
}

pub fn decode_html(text: &str) -> String {
    text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}
