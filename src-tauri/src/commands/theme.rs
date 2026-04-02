use crate::db::models::settings::{Setting, UpsertSetting};
use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;

/// Database state shared across Tauri commands
type DbState = Arc<Mutex<Option<Database>>>;

/// Theme settings structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeSettings {
    pub theme_color: String,
    pub theme_mode: String,
    pub custom_color: String,
    pub font_family_preset: String,
    pub text_color_primary: String,
    pub text_color_secondary: String,
    pub baseplate_style: String,
    pub baseplate_color_a: String,
    pub baseplate_color_b: String,
    pub baseplate_angle: i32,
    pub baseplate_intensity: i32,
    pub baseplate_use_theme_accent: bool,
    pub baseplate_image_path: String,
    pub baseplate_image_opacity: i32,
    pub baseplate_image_blur: i32,
}

fn default_theme_settings() -> ThemeSettings {
    ThemeSettings {
        theme_color: "green".to_string(),
        theme_mode: "auto".to_string(),
        custom_color: "#1db954".to_string(),
        font_family_preset: "system".to_string(),
        text_color_primary: "#f7fbff".to_string(),
        text_color_secondary: "#dbe5f3".to_string(),
        baseplate_style: "linear-gradient".to_string(),
        baseplate_color_a: "#102038".to_string(),
        baseplate_color_b: "#415b86".to_string(),
        baseplate_angle: 140,
        baseplate_intensity: 78,
        baseplate_use_theme_accent: false,
        baseplate_image_path: String::new(),
        baseplate_image_opacity: 72,
        baseplate_image_blur: 10,
    }
}

fn get_theme_assets_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data_dir.join("theme_assets"))
}

fn extract_extension(path: &Path) -> &str {
    path.extension().and_then(|ext| ext.to_str()).unwrap_or("png")
}

fn is_managed_theme_asset(path: &Path, assets_dir: &Path) -> bool {
    path.starts_with(assets_dir)
}

async fn get_string_setting(
    pool: &sqlx::SqlitePool,
    key: &str,
    fallback: &str,
) -> Result<String, String> {
    Ok(match Setting::get(pool, key).await.map_err(|e| e.to_string())? {
        Some(setting) => setting.value,
        None => fallback.to_string(),
    })
}

async fn get_i32_setting(
    pool: &sqlx::SqlitePool,
    key: &str,
    fallback: i32,
) -> Result<i32, String> {
    let value = get_string_setting(pool, key, &fallback.to_string()).await?;
    Ok(value.parse::<i32>().unwrap_or(fallback))
}

async fn get_bool_setting(
    pool: &sqlx::SqlitePool,
    key: &str,
    fallback: bool,
) -> Result<bool, String> {
    let value = get_string_setting(pool, key, if fallback { "true" } else { "false" }).await?;
    Ok(matches!(value.trim(), "1" | "true" | "TRUE" | "True"))
}

async fn save_theme_setting(
    pool: &sqlx::SqlitePool,
    key: &str,
    value: impl Into<String>,
) -> Result<(), String> {
    Setting::set(
        pool,
        UpsertSetting {
            key: key.to_string(),
            value: value.into(),
        },
    )
    .await
    .map(|_| ())
    .map_err(|e| e.to_string())
}

/// Get theme settings from database
#[tauri::command]
pub async fn get_theme(db_state: State<'_, DbState>) -> Result<ThemeSettings, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    let pool = db.pool();
    let defaults = default_theme_settings();

    Ok(ThemeSettings {
        theme_color: get_string_setting(pool, "theme_color", &defaults.theme_color).await?,
        theme_mode: get_string_setting(pool, "theme_mode", &defaults.theme_mode).await?,
        custom_color: get_string_setting(pool, "custom_color", &defaults.custom_color).await?,
        font_family_preset: get_string_setting(
            pool,
            "font_family_preset",
            &defaults.font_family_preset,
        )
        .await?,
        text_color_primary: get_string_setting(
            pool,
            "text_color_primary",
            &defaults.text_color_primary,
        )
        .await?,
        text_color_secondary: get_string_setting(
            pool,
            "text_color_secondary",
            &defaults.text_color_secondary,
        )
        .await?,
        baseplate_style: get_string_setting(pool, "baseplate_style", &defaults.baseplate_style)
            .await?,
        baseplate_color_a: get_string_setting(
            pool,
            "baseplate_color_a",
            &defaults.baseplate_color_a,
        )
        .await?,
        baseplate_color_b: get_string_setting(
            pool,
            "baseplate_color_b",
            &defaults.baseplate_color_b,
        )
        .await?,
        baseplate_angle: get_i32_setting(pool, "baseplate_angle", defaults.baseplate_angle).await?,
        baseplate_intensity: get_i32_setting(
            pool,
            "baseplate_intensity",
            defaults.baseplate_intensity,
        )
        .await?,
        baseplate_use_theme_accent: get_bool_setting(
            pool,
            "baseplate_use_theme_accent",
            defaults.baseplate_use_theme_accent,
        )
        .await?,
        baseplate_image_path: get_string_setting(
            pool,
            "baseplate_image_path",
            &defaults.baseplate_image_path,
        )
        .await?,
        baseplate_image_opacity: get_i32_setting(
            pool,
            "baseplate_image_opacity",
            defaults.baseplate_image_opacity,
        )
        .await?,
        baseplate_image_blur: get_i32_setting(
            pool,
            "baseplate_image_blur",
            defaults.baseplate_image_blur,
        )
        .await?,
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

    save_theme_setting(pool, "theme_color", settings.theme_color.clone()).await?;
    save_theme_setting(pool, "theme_mode", settings.theme_mode.clone()).await?;
    save_theme_setting(pool, "custom_color", settings.custom_color.clone()).await?;
    save_theme_setting(
        pool,
        "font_family_preset",
        settings.font_family_preset.clone(),
    )
    .await?;
    save_theme_setting(
        pool,
        "text_color_primary",
        settings.text_color_primary.clone(),
    )
    .await?;
    save_theme_setting(
        pool,
        "text_color_secondary",
        settings.text_color_secondary.clone(),
    )
    .await?;
    save_theme_setting(pool, "baseplate_style", settings.baseplate_style.clone()).await?;
    save_theme_setting(pool, "baseplate_color_a", settings.baseplate_color_a.clone()).await?;
    save_theme_setting(pool, "baseplate_color_b", settings.baseplate_color_b.clone()).await?;
    save_theme_setting(pool, "baseplate_angle", settings.baseplate_angle.to_string()).await?;
    save_theme_setting(
        pool,
        "baseplate_intensity",
        settings.baseplate_intensity.to_string(),
    )
    .await?;
    save_theme_setting(
        pool,
        "baseplate_use_theme_accent",
        settings.baseplate_use_theme_accent.to_string(),
    )
    .await?;
    save_theme_setting(
        pool,
        "baseplate_image_path",
        settings.baseplate_image_path.clone(),
    )
    .await?;
    save_theme_setting(
        pool,
        "baseplate_image_opacity",
        settings.baseplate_image_opacity.to_string(),
    )
    .await?;
    save_theme_setting(
        pool,
        "baseplate_image_blur",
        settings.baseplate_image_blur.to_string(),
    )
    .await?;

    Ok(settings)
}

/// Reset theme settings to defaults
#[tauri::command]
pub async fn reset_theme(db_state: State<'_, DbState>) -> Result<ThemeSettings, String> {
    let guard = db_state.lock().await;
    let db = guard.as_ref().ok_or("Database not initialized")?;
    let pool = db.pool();

    let defaults = default_theme_settings();

    save_theme_setting(pool, "theme_color", defaults.theme_color.clone()).await?;
    save_theme_setting(pool, "theme_mode", defaults.theme_mode.clone()).await?;
    save_theme_setting(pool, "custom_color", defaults.custom_color.clone()).await?;
    save_theme_setting(
        pool,
        "font_family_preset",
        defaults.font_family_preset.clone(),
    )
    .await?;
    save_theme_setting(
        pool,
        "text_color_primary",
        defaults.text_color_primary.clone(),
    )
    .await?;
    save_theme_setting(
        pool,
        "text_color_secondary",
        defaults.text_color_secondary.clone(),
    )
    .await?;
    save_theme_setting(pool, "baseplate_style", defaults.baseplate_style.clone()).await?;
    save_theme_setting(pool, "baseplate_color_a", defaults.baseplate_color_a.clone()).await?;
    save_theme_setting(pool, "baseplate_color_b", defaults.baseplate_color_b.clone()).await?;
    save_theme_setting(pool, "baseplate_angle", defaults.baseplate_angle.to_string()).await?;
    save_theme_setting(
        pool,
        "baseplate_intensity",
        defaults.baseplate_intensity.to_string(),
    )
    .await?;
    save_theme_setting(
        pool,
        "baseplate_use_theme_accent",
        defaults.baseplate_use_theme_accent.to_string(),
    )
    .await?;
    save_theme_setting(
        pool,
        "baseplate_image_path",
        defaults.baseplate_image_path.clone(),
    )
    .await?;
    save_theme_setting(
        pool,
        "baseplate_image_opacity",
        defaults.baseplate_image_opacity.to_string(),
    )
    .await?;
    save_theme_setting(
        pool,
        "baseplate_image_blur",
        defaults.baseplate_image_blur.to_string(),
    )
    .await?;

    Ok(defaults)
}

#[tauri::command]
pub async fn import_theme_baseplate_image(
    app: AppHandle,
    source_path: String,
    previous_path: Option<String>,
) -> Result<String, String> {
    let source = PathBuf::from(source_path.trim());
    if !source.exists() {
        return Err("Selected image file does not exist".to_string());
    }
    if !source.is_file() {
        return Err("Selected image path is not a file".to_string());
    }

    let assets_dir = get_theme_assets_dir(&app)?;
    fs::create_dir_all(&assets_dir).map_err(|e| format!("Failed to create theme assets dir: {}", e))?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let extension = extract_extension(&source);
    let target = assets_dir.join(format!("baseplate-{}.{}", now, extension));

    fs::copy(&source, &target).map_err(|e| format!("Failed to copy baseplate image: {}", e))?;

    if let Some(previous) = previous_path {
        let previous = PathBuf::from(previous.trim());
        if !previous.as_os_str().is_empty()
            && previous.exists()
            && is_managed_theme_asset(&previous, &assets_dir)
            && previous != target
        {
            let _ = fs::remove_file(previous);
        }
    }

    Ok(target.to_string_lossy().to_string())
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
            font_family_preset: "apple".to_string(),
            text_color_primary: "#f8fafc".to_string(),
            text_color_secondary: "#d6e0ee".to_string(),
            baseplate_style: "radial-gradient".to_string(),
            baseplate_color_a: "#0f172a".to_string(),
            baseplate_color_b: "#1d4ed8".to_string(),
            baseplate_angle: 120,
            baseplate_intensity: 84,
            baseplate_use_theme_accent: true,
            baseplate_image_path: "/tmp/baseplate.png".to_string(),
            baseplate_image_opacity: 68,
            baseplate_image_blur: 12,
        };

        let serialized = serde_json::to_string(&settings).unwrap();
        let deserialized: ThemeSettings = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.theme_color, "blue");
        assert_eq!(deserialized.theme_mode, "dark");
        assert_eq!(deserialized.custom_color, "#007bff");
        assert_eq!(deserialized.font_family_preset, "apple");
        assert_eq!(deserialized.text_color_primary, "#f8fafc");
        assert_eq!(deserialized.text_color_secondary, "#d6e0ee");
        assert_eq!(deserialized.baseplate_style, "radial-gradient");
        assert_eq!(deserialized.baseplate_angle, 120);
        assert_eq!(deserialized.baseplate_intensity, 84);
        assert!(deserialized.baseplate_use_theme_accent);
        assert_eq!(deserialized.baseplate_image_path, "/tmp/baseplate.png");
        assert_eq!(deserialized.baseplate_image_opacity, 68);
        assert_eq!(deserialized.baseplate_image_blur, 12);
    }
}
