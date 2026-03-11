use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::db::{Database, get_pool};
use crate::db::models::settings::{Setting, UpsertSetting};

/// Database state shared across Tauri commands
pub type DbState = Arc<Mutex<Option<Database>>>;

/// Theme settings structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeSettings {
    pub theme_color: String,
    pub theme_mode: String,
    pub custom_color: String,
}

/// Get theme settings from database
#[tauri::command]
pub async fn get_theme(
    db_state: State<'_, DbState>,
) -> Result<ThemeSettings, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    let pool = db.pool();

    // Get theme settings with defaults
    let theme_color = match Setting::get(pool, "theme_color").await.map_err(|e| e.to_string())? {
        Some(s) => s.value,
        None => "green".to_string(),
    };

    let theme_mode = match Setting::get(pool, "theme_mode").await.map_err(|e| e.to_string())? {
        Some(s) => s.value,
        None => "auto".to_string(),
    };

    let custom_color = match Setting::get(pool, "custom_color").await.map_err(|e| e.to_string())? {
        Some(s) => s.value,
        None => "#1db954".to_string(),
    };

    Ok(ThemeSettings {
        theme_color,
        theme_mode,
        custom_color,
    })
}

/// Save theme settings to database
#[tauri::command]
pub async fn set_theme(
    db_state: State<'_, DbState>,
    settings: ThemeSettings,
) -> Result<ThemeSettings, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    let pool = db.pool();

    // Save each theme setting
    Setting::set(pool, UpsertSetting {
        key: "theme_color".to_string(),
        value: settings.theme_color.clone(),
    }).await.map_err(|e| e.to_string())?;

    Setting::set(pool, UpsertSetting {
        key: "theme_mode".to_string(),
        value: settings.theme_mode.clone(),
    }).await.map_err(|e| e.to_string())?;

    Setting::set(pool, UpsertSetting {
        key: "custom_color".to_string(),
        value: settings.custom_color.clone(),
    }).await.map_err(|e| e.to_string())?;

    Ok(settings)
}

/// Reset theme settings to defaults
#[tauri::command]
pub async fn reset_theme(
    db_state: State<'_, DbState>,
) -> Result<ThemeSettings, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    let pool = db.pool();

    let defaults = ThemeSettings {
        theme_color: "green".to_string(),
        theme_mode: "auto".to_string(),
        custom_color: "#1db954".to_string(),
    };

    // Save default settings
    Setting::set(pool, UpsertSetting {
        key: "theme_color".to_string(),
        value: defaults.theme_color.clone(),
    }).await.map_err(|e| e.to_string())?;

    Setting::set(pool, UpsertSetting {
        key: "theme_mode".to_string(),
        value: defaults.theme_mode.clone(),
    }).await.map_err(|e| e.to_string())?;

    Setting::set(pool, UpsertSetting {
        key: "custom_color".to_string(),
        value: defaults.custom_color.clone(),
    }).await.map_err(|e| e.to_string())?;

    Ok(defaults)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_theme_settings_serialization() {
        let settings = ThemeSettings {
            theme_color: "blue".to_string(),
            theme_mode: "dark".to_string(),
            custom_color: "#007bff".to_string(),
        };

        let serialized = serde_json::to_string(&settings).unwrap();
        let deserialized: ThemeSettings = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.theme_color, "blue");
        assert_eq!(deserialized.theme_mode, "dark");
        assert_eq!(deserialized.custom_color, "#007bff");
    }
}
