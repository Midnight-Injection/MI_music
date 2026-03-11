use std::collections::HashMap;
use reqwest::{Client, Method, header::{HeaderMap, HeaderName, HeaderValue}};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptHttpRequestBody {
    pub kind: String,
    pub data: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptHttpRequest {
    pub url: String,
    pub method: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<ScriptHttpRequestBody>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptHttpResponse {
    pub status_code: u16,
    pub status_message: String,
    pub body: Value,
    pub headers: HashMap<String, Value>,
    pub bytes: Vec<u8>,
    pub raw: Vec<u8>,
}

fn build_headers(headers: Option<HashMap<String, String>>) -> Result<HeaderMap, String> {
    let mut header_map = HeaderMap::new();

    for (key, value) in headers.unwrap_or_default() {
        let header_name = HeaderName::from_bytes(key.as_bytes())
            .map_err(|e| format!("Invalid header name {}: {}", key, e))?;
        let normalized = value.replace('\n', "").replace('\r', "");
        let header_value = HeaderValue::from_str(&normalized)
            .map_err(|e| format!("Invalid header value for {}: {}", key, e))?;
        header_map.append(header_name, header_value);
    }

    Ok(header_map)
}

fn build_body(body: Option<ScriptHttpRequestBody>) -> Option<Vec<u8>> {
    let body = body?;
    match body.kind.as_str() {
        "base64" => base64::decode(body.data).ok(),
        _ => Some(body.data.into_bytes()),
    }
}

fn parse_response_body(bytes: &[u8]) -> Value {
    if bytes.is_empty() {
        return Value::String(String::new());
    }

    serde_json::from_slice(bytes)
        .unwrap_or_else(|_| Value::String(String::from_utf8_lossy(bytes).to_string()))
}

fn collect_response_headers(headers: &HeaderMap) -> HashMap<String, Value> {
    let mut result = HashMap::new();

    for name in headers.keys() {
        let values: Vec<String> = headers
            .get_all(name)
            .iter()
            .filter_map(|value| value.to_str().ok().map(|text| text.to_string()))
            .collect();

        if values.is_empty() {
            continue;
        }

        let key = name.as_str().to_lowercase();
        if values.len() == 1 {
            result.insert(key, Value::String(values[0].clone()));
        } else {
            result.insert(key, Value::Array(values.into_iter().map(Value::String).collect()));
        }
    }

    result
}

#[tauri::command]
pub async fn script_http_request(request: ScriptHttpRequest) -> Result<ScriptHttpResponse, String> {
    let method = Method::from_bytes(request.method.unwrap_or_else(|| "GET".to_string()).as_bytes())
        .map_err(|e| format!("Invalid method: {}", e))?;

    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_millis(request.timeout_ms.unwrap_or(20_000)))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut req = client
        .request(method, &request.url)
        .headers(build_headers(request.headers)?);

    if let Some(body) = build_body(request.body) {
        req = req.body(body);
    }

    let response = req.send().await.map_err(|e| e.to_string())?;
    let status_code = response.status().as_u16();
    let status_message = response
        .status()
        .canonical_reason()
        .unwrap_or("")
        .to_string();
    let headers = collect_response_headers(response.headers());
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let raw = bytes.to_vec();
    let body = parse_response_body(&raw);

    Ok(ScriptHttpResponse {
        status_code,
        status_message,
        body,
        headers,
        bytes: raw.clone(),
        raw,
    })
}
