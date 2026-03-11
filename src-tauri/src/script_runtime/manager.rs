//! Script Runtime Manager
//!
//! Manages WebView instances for executing user music source scripts.
//! Uses lazy-loading to minimize memory footprint.

use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl, Emitter};
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

/// Source action types that can be executed
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SourceAction {
    MusicUrl,
    Lyric,
    Pic,
    Search,
}

/// Music info for URL retrieval
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MusicRequest {
    pub source: String,
    pub music_info: serde_json::Value,
    pub quality: String,
}

/// Search request parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRequest {
    pub keyword: String,
    pub page: i32,
    pub limit: i32,
}

/// Script Runtime Manager
pub struct ScriptRuntimeManager {
    app: AppHandle,
    /// Map of source_id -> (WebView window label, script content)
    instances: Arc<Mutex<HashMap<String, (String, String)>>>,
}

impl ScriptRuntimeManager {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            instances: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Initialize a script runtime for a user source
    pub async fn initialize(&self, source_id: &str, script: &str) -> Result<(), String> {
        let window_label = format!("script_{}", source_id);

        // Store reference with script
        let mut instances = self.instances.lock().await;
        instances.insert(source_id.to_string(), (window_label.clone(), script.to_string()));

        println!("[ScriptRuntime] Initialized for source: {}", source_id);
        Ok(())
    }

    /// Execute search action in the script runtime
    pub async fn execute_search(
        &self,
        source_id: &str,
        keyword: &str,
        page: i32,
        limit: i32,
    ) -> Result<Vec<serde_json::Value>, String> {
        let instances = self.instances.lock().await;

        let (window_label, script) = instances.get(source_id)
            .ok_or_else(|| format!("Source {} not initialized", source_id))?;

        println!("[ScriptRuntime] Executing search for source: {}, keyword: {}", source_id, keyword);

        // Emit event to frontend to execute in hidden webview
        let payload = serde_json::json!({
            "sourceId": source_id,
            "windowLabel": window_label,
            "script": script,
            "action": "search",
            "keyword": keyword,
            "page": page,
            "limit": limit,
        });

        // Emit event for frontend to handle
        self.app.emit("script:execute-search", &payload)
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        // Return empty for now - frontend will handle actual execution
        Ok(Vec::new())
    }

    /// Execute music URL retrieval
    pub async fn execute_get_music_url(
        &self,
        source_id: &str,
        music_info: serde_json::Value,
        quality: &str,
    ) -> Result<String, String> {
        let instances = self.instances.lock().await;

        let (window_label, script) = instances.get(source_id)
            .ok_or_else(|| format!("Source {} not initialized", source_id))?;

        println!("[ScriptRuntime] Getting music URL for source: {}", source_id);

        // Emit event to frontend
        let payload = serde_json::json!({
            "sourceId": source_id,
            "windowLabel": window_label,
            "script": script,
            "action": "musicUrl",
            "musicInfo": music_info,
            "quality": quality,
        });

        self.app.emit("script:execute-music-url", &payload)
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        Err("Music URL retrieval requires frontend handler".to_string())
    }

    /// Cleanup inactive script runtimes
    pub async fn cleanup(&self) {
        let mut instances = self.instances.lock().await;
        instances.clear();
    }
}
