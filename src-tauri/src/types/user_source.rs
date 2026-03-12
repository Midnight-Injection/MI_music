use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 用户自定义音源脚本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSourceScript {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub homepage: String,
    pub script: String,
    pub sources: HashMap<String, UserSourceInfo>,
    pub allow_show_update_alert: bool,
    pub enabled: bool,
    #[serde(default = "default_user_source_priority")]
    pub priority: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

fn default_user_source_priority() -> i32 {
    100
}

/// 用户音源信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSourceInfo {
    #[serde(rename = "type")]
    pub source_type: String,
    pub actions: Vec<String>,
    pub qualitys: Vec<String>,
}

/// 用户音源状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSourceState {
    pub status: bool,
    pub message: Option<String>,
    pub api_info: Option<UserSourceInfo>,
}

/// 脚本元数据（从 JS 文件注释中解析）
#[derive(Debug, Clone, Default)]
pub struct ScriptMetadata {
    pub name: String,
    pub version: Option<String>,
    pub description: Option<String>,
    pub author: Option<String>,
    pub homepage: Option<String>,
    pub sources: Option<HashMap<String, UserSourceInfo>>,
    pub allow_show_update_alert: Option<bool>,
}
