use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

use crate::types::{UserSourceInfo, UserSourceScript};

use super::user_source::{read_user_sources, save_user_sources};

fn contains_js_files(path: &Path) -> bool {
    if !path.is_dir() {
        return false;
    }

    let Ok(entries) = fs::read_dir(path) else {
        return false;
    };

    entries.filter_map(Result::ok).any(|entry| {
        entry
            .path()
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.eq_ignore_ascii_case("js"))
            .unwrap_or(false)
    })
}

fn collect_resource_candidates(resource_dir: &Path) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    for relative in [
        "default-sources",
        "洛雪音乐-音源",
        "音源文件",
        "docs/音源文件",
        "_up_/docs/音源文件",
    ] {
        candidates.push(resource_dir.join(relative));
    }

    if let Ok(entries) = fs::read_dir(resource_dir) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if contains_js_files(&path) {
                candidates.push(path.clone());
            }

            if path.is_dir() {
                if let Ok(children) = fs::read_dir(&path) {
                    for child in children.filter_map(Result::ok) {
                        let child_path = child.path();
                        if contains_js_files(&child_path) {
                            candidates.push(child_path);
                        }
                    }
                }
            }
        }
    }

    candidates
}

/// Get the default sources directory path
/// In dev mode: project_root/洛雪音乐-音源/ or project_root/docs/音源文件/
/// In production: app_resource_dir/default-sources/ (with bundled path fallbacks)
fn get_default_sources_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut checked_paths = Vec::new();

    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let manifest_dir = PathBuf::from(manifest_dir);
        if let Some(project_root) = manifest_dir.parent() {
            for candidate in [
                project_root.join("洛雪音乐-音源"),
                project_root.join("default-sources"),
                project_root.join("docs").join("音源文件"),
            ] {
                checked_paths.push(candidate.display().to_string());
                if contains_js_files(&candidate) {
                    return Ok(candidate);
                }
            }
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        for candidate in collect_resource_candidates(&resource_dir) {
            checked_paths.push(candidate.display().to_string());
            if contains_js_files(&candidate) {
                return Ok(candidate);
            }
        }
    }

    Err(format!(
        "Default sources directory not found. Checked: {}",
        checked_paths.join(", ")
    ))
}

/// Check if default sources have been imported
#[tauri::command]
pub async fn has_default_sources_been_imported(app: AppHandle) -> Result<bool, String> {
    let sources = read_user_sources(&app).await?;
    Ok(!sources.is_empty())
}

/// Parse script metadata from JS file content
fn parse_script_metadata(content: &str) -> Result<ScriptMetadata, String> {
    let mut metadata = ScriptMetadata::default();

    // Helper function: parse metadata line
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
        }
    };

    // Find first block comment (/* or /*!)
    let block_start = content.find("/*").or_else(|| content.find("/*!"));
    if let Some(start_idx) = block_start {
        // Find end of block comment
        let search_start = start_idx + 2;
        if let Some(end_idx) = content[search_start..].find("*/") {
            let block_content = &content[search_start..search_start + end_idx];
            // Skip leading ! if it's /*!
            let block_content = block_content.strip_prefix('!').unwrap_or(block_content);

            for line in block_content.lines() {
                parse_meta_line(line, &mut metadata);
            }
        }
    }

    // Also parse single-line comments // @name
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("//") {
            let comment = line[2..].trim();
            parse_meta_line(comment, &mut metadata);
        }
    }

    if metadata.name.is_empty() {
        return Err("Script must have a @name metadata in comments".to_string());
    }

    Ok(metadata)
}

/// Script metadata parsed from JS file
#[derive(Debug, Clone, Default)]
struct ScriptMetadata {
    name: String,
    version: Option<String>,
    description: Option<String>,
    author: Option<String>,
    homepage: Option<String>,
}

/// Import default music sources from bundled directory
#[tauri::command]
pub async fn import_default_sources(app: AppHandle) -> Result<Vec<UserSourceScript>, String> {
    let default_sources_dir = get_default_sources_dir(&app)?;

    // Read existing sources to avoid duplicates
    let mut existing_sources = read_user_sources(&app).await?;
    let existing_names: Vec<String> = existing_sources.iter().map(|s| s.name.clone()).collect();

    let mut imported = Vec::new();
    let now = chrono::Utc::now().timestamp();
    let mut id_counter = existing_sources.len() as i64;

    // Read all .js files from the default sources directory
    let entries = fs::read_dir(&default_sources_dir)
        .map_err(|e| format!("Failed to read default sources directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        // Only process .js files
        if path.extension().map(|e| e == "js").unwrap_or(false) {
            let content = match fs::read_to_string(&path) {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("[DefaultSources] Failed to read {:?}: {}", path, e);
                    continue;
                }
            };

            // Parse script metadata
            let metadata = match parse_script_metadata(&content) {
                Ok(m) => m,
                Err(e) => {
                    eprintln!("[DefaultSources] Failed to parse {:?}: {}", path, e);
                    continue;
                }
            };

            // Skip if already imported (by name)
            if existing_names.contains(&metadata.name) {
                println!(
                    "[DefaultSources] Skipping already imported: {}",
                    metadata.name
                );
                continue;
            }

            // Create unique ID
            id_counter += 1;
            let id = format!("default_{}", now + id_counter);

            // Create default sources config for kw, kg, tx, wy, mg
            let default_sources = create_default_source_info();

            let user_source = UserSourceScript {
                id,
                name: metadata.name,
                version: metadata.version.unwrap_or_else(|| "1.0.0".to_string()),
                description: metadata.description.unwrap_or_default(),
                author: metadata.author.unwrap_or_default(),
                homepage: metadata.homepage.unwrap_or_default(),
                script: content,
                sources: default_sources,
                allow_show_update_alert: false,
                enabled: true,
                priority: existing_sources
                    .iter()
                    .map(|source| source.priority)
                    .max()
                    .unwrap_or(0)
                    + 1,
                created_at: now,
                updated_at: now,
            };

            println!(
                "[DefaultSources] Imported: {} ({})",
                user_source.name, user_source.id
            );
            existing_sources.push(user_source.clone());
            imported.push(user_source);
        }
    }

    // Save updated sources
    if !imported.is_empty() {
        save_user_sources(&app, &existing_sources).await?;
        println!("[DefaultSources] Imported {} sources", imported.len());
    }

    Ok(imported)
}

/// Create default source info for all platforms
fn create_default_source_info() -> std::collections::HashMap<String, UserSourceInfo> {
    let mut sources = std::collections::HashMap::new();

    let actions = vec![
        "musicUrl".to_string(),
        "lyric".to_string(),
        "search".to_string(),
        "pic".to_string(),
    ];
    let qualitys = vec!["128k".to_string(), "320k".to_string(), "flac".to_string()];

    for source in &["kw", "kg", "tx", "wy", "mg"] {
        sources.insert(
            source.to_string(),
            UserSourceInfo {
                source_type: "music".to_string(),
                actions: actions.clone(),
                qualitys: qualitys.clone(),
            },
        );
    }

    sources
}

/// Get list of available default source files
#[tauri::command]
pub async fn list_available_default_sources(app: AppHandle) -> Result<Vec<String>, String> {
    let default_sources_dir = match get_default_sources_dir(&app) {
        Ok(dir) => dir,
        Err(_) => return Ok(Vec::new()),
    };

    let mut sources = Vec::new();

    let entries = fs::read_dir(&default_sources_dir)
        .map_err(|e| format!("Failed to read default sources directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().map(|e| e == "js").unwrap_or(false) {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                sources.push(name.to_string());
            }
        }
    }

    Ok(sources)
}
