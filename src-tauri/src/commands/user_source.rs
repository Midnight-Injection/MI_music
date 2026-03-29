use serde::Deserialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::{ScriptMetadata, UserSourceInfo, UserSourceScript};

const USER_SOURCES_FILE: &str = "user_sources.json";

#[derive(Debug, Deserialize)]
struct StoredUserSourceScript {
    id: String,
    name: String,
    version: String,
    description: String,
    author: String,
    homepage: String,
    script: String,
    sources: std::collections::HashMap<String, UserSourceInfo>,
    allow_show_update_alert: bool,
    enabled: bool,
    priority: Option<i32>,
    created_at: i64,
    updated_at: i64,
}

fn normalize_source_priorities(sources: &mut [UserSourceScript], raw_priorities: &[Option<i32>]) {
    for (index, source) in sources.iter_mut().enumerate() {
        let raw_priority = raw_priorities.get(index).copied().flatten();
        if raw_priority.unwrap_or(0) <= 0 {
            source.priority = (index as i32) + 1;
        }
    }
}

/// 获取用户音源存储路径
fn get_user_sources_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data_dir.join(USER_SOURCES_FILE))
}

/// 从 JS 脚本中解析元数据
fn parse_script(content: &str) -> Result<ScriptMetadata, String> {
    let mut metadata = ScriptMetadata::default();

    // 辅助函数：解析元数据行
    let parse_meta_line = |line: &str, meta: &mut ScriptMetadata| {
        let line = line.trim().trim_start_matches('*').trim();
        if let Some(value) = line.strip_prefix("@name") {
            meta.name = value.trim().to_string();
        } else if let Some(value) = line.strip_prefix("@version") {
            meta.version = Some(value.trim().to_string());
        } else if let Some(value) = line.strip_prefix("@description") {
            meta.description = Some(value.trim().to_string());
        } else if let Some(value) = line.strip_prefix("@author") {
            meta.author = Some(value.trim().to_string());
        } else if let Some(value) = line.strip_prefix("@homepage") {
            meta.homepage = Some(value.trim().to_string());
        } else if let Some(value) = line.strip_prefix("@repository") {
            meta.homepage = Some(value.trim().to_string());
        }
    };

    // 查找第一个块注释 (/* 或 /*!)
    let block_start = content.find("/*").or_else(|| content.find("/*!"));
    if let Some(start_idx) = block_start {
        // 找到块注释的结束位置
        let search_start = start_idx + 2;
        if let Some(end_idx) = content[search_start..].find("*/") {
            let block_content = &content[search_start..search_start + end_idx];
            // 跳过开头的 ! 如果是 /*!
            let block_content = block_content.strip_prefix('!').unwrap_or(block_content);

            for line in block_content.lines() {
                parse_meta_line(line, &mut metadata);
            }
        }
    }

    // 同时解析单行注释 // @name
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("//") {
            let comment = line[2..].trim();
            parse_meta_line(comment, &mut metadata);
        }
    }

    if metadata.name.is_empty() {
        return Err("Script must have a @name metadata in comments (e.g., // @name 脚本名称 or /* @name 脚本名称 */)".to_string());
    }

    Ok(metadata)
}

#[cfg(test)]
mod tests {
    use super::parse_script;

    #[test]
    fn parse_script_supports_jsdoc_block_comments() {
        let script = r#"/**
 * @name 测试音源
 * @description 一个测试脚本
 * @version 1.2.3
 * @author tester
 * @homepage https://example.com
 */
        console.log('ok')
        "#;

        let metadata =
            parse_script(script).expect("should parse metadata from jsdoc block comment");
        assert_eq!(metadata.name, "测试音源");
        assert_eq!(metadata.description.as_deref(), Some("一个测试脚本"));
        assert_eq!(metadata.version.as_deref(), Some("1.2.3"));
        assert_eq!(metadata.author.as_deref(), Some("tester"));
        assert_eq!(metadata.homepage.as_deref(), Some("https://example.com"));
    }

    #[test]
    fn parse_script_supports_bang_block_comments() {
        let script = r#"/*!
 * @name 测试音源
 */
        "#;

        let metadata = parse_script(script).expect("should parse metadata from bang block comment");
        assert_eq!(metadata.name, "测试音源");
    }
}

/// 读取所有用户音源
pub async fn read_user_sources(app: &AppHandle) -> Result<Vec<UserSourceScript>, String> {
    let path = get_user_sources_path(app)?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read user sources file: {}", e))?;

    let stored_sources: Vec<StoredUserSourceScript> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse user sources: {}", e))?;
    let raw_priorities: Vec<Option<i32>> = stored_sources
        .iter()
        .map(|source| source.priority)
        .collect();
    let mut sources: Vec<UserSourceScript> = stored_sources
        .into_iter()
        .map(|source| UserSourceScript {
            id: source.id,
            name: source.name,
            version: source.version,
            description: source.description,
            author: source.author,
            homepage: source.homepage,
            script: source.script,
            sources: source.sources,
            allow_show_update_alert: source.allow_show_update_alert,
            enabled: source.enabled,
            priority: source.priority.unwrap_or_default(),
            created_at: source.created_at,
            updated_at: source.updated_at,
        })
        .collect();
    normalize_source_priorities(&mut sources, &raw_priorities);

    Ok(sources)
}

/// 保存所有用户音源
pub async fn save_user_sources(
    app: &AppHandle,
    sources: &[UserSourceScript],
) -> Result<(), String> {
    let path = get_user_sources_path(app)?;

    // 确保目录存在
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    }

    let content = serde_json::to_string_pretty(sources)
        .map_err(|e| format!("Failed to serialize user sources: {}", e))?;

    tokio::fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write user sources file: {}", e))?;

    Ok(())
}

/// 导入用户音源（通过文件路径）
#[tauri::command]
pub async fn import_user_source_from_file(
    app: AppHandle,
    file_path: String,
) -> Result<UserSourceScript, String> {
    let path = std::path::PathBuf::from(&file_path);

    // 读取文件内容
    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // 解析脚本元数据
    let metadata = parse_script(&content)?;

    // 生成 ID
    let now = chrono::Utc::now().timestamp();
    let id = format!("user_{}", now);
    let mut sources = read_user_sources(&app).await?;
    let next_priority = sources
        .iter()
        .map(|source| source.priority)
        .max()
        .unwrap_or(0)
        + 1;

    // 创建用户音源对象
    let user_source = UserSourceScript {
        id,
        name: metadata.name,
        version: metadata.version.unwrap_or_else(|| "1.0.0".to_string()),
        description: metadata.description.unwrap_or_default(),
        author: metadata.author.unwrap_or_default(),
        homepage: metadata.homepage.unwrap_or_default(),
        script: content,
        sources: metadata.sources.unwrap_or_default(),
        allow_show_update_alert: metadata.allow_show_update_alert.unwrap_or(false),
        enabled: true,
        priority: next_priority,
        created_at: now,
        updated_at: now,
    };

    // 读取现有音源并添加新的
    sources.push(user_source.clone());

    // 保存到本地
    save_user_sources(&app, &sources).await?;

    Ok(user_source)
}

/// 获取所有用户音源
#[tauri::command]
pub async fn get_user_sources(app: AppHandle) -> Result<Vec<UserSourceScript>, String> {
    read_user_sources(&app).await
}

/// 获取单个用户音源
#[tauri::command]
pub async fn get_user_source(app: AppHandle, id: String) -> Result<UserSourceScript, String> {
    let sources = read_user_sources(&app).await?;

    sources
        .into_iter()
        .find(|s| s.id == id)
        .ok_or_else(|| format!("User source not found: {}", id))
}

/// 更新用户音源状态
#[tauri::command]
pub async fn update_user_source(
    app: AppHandle,
    id: String,
    enabled: Option<bool>,
    priority: Option<i32>,
) -> Result<UserSourceScript, String> {
    let mut sources = read_user_sources(&app).await?;

    let source = sources
        .iter_mut()
        .find(|s| s.id == id)
        .ok_or_else(|| format!("User source not found: {}", id))?;

    if let Some(enabled) = enabled {
        source.enabled = enabled;
    }
    if let Some(priority) = priority {
        source.priority = priority.max(1);
    }
    source.updated_at = chrono::Utc::now().timestamp();

    let updated = source.clone();
    save_user_sources(&app, &sources).await?;

    Ok(updated)
}

/// 删除用户音源
#[tauri::command]
pub async fn delete_user_source(app: AppHandle, id: String) -> Result<(), String> {
    let mut sources = read_user_sources(&app).await?;

    let initial_len = sources.len();
    sources.retain(|s| s.id != id);

    if sources.len() == initial_len {
        return Err(format!("User source not found: {}", id));
    }

    save_user_sources(&app, &sources).await?;

    Ok(())
}

/// 导出用户音源
#[tauri::command]
pub async fn export_user_source(app: AppHandle, id: String) -> Result<String, String> {
    let source = get_user_source(app, id).await?;
    Ok(source.script)
}
