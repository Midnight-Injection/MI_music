// Tauri commands for audio effects control

use crate::effects::{EffectChain, EffectSettings};
use std::sync::Arc;

lazy_static::lazy_static! {
    static ref EFFECT_CHAIN: Arc<EffectChain> = Arc::new(EffectChain::new());
}

/// Set gain for a specific equalizer band
#[tauri::command]
pub async fn set_equalizer_band(band: usize, gain: f32) -> Result<(), String> {
    EFFECT_CHAIN
        .set_equalizer_band(band, gain)
        .await
}

/// Reset equalizer to flat response
#[tauri::command]
pub async fn reset_equalizer() -> Result<(), String> {
    EFFECT_CHAIN.reset_equalizer().await
}

/// Set reverb wet/dry mix
#[tauri::command]
pub async fn set_reverb_mix(mix: f32) -> Result<(), String> {
    EFFECT_CHAIN.set_reverb_mix(mix).await
}

/// Set reverb preset
#[tauri::command]
pub async fn set_reverb_preset(preset: String) -> Result<(), String> {
    // This will be implemented when Reverb is integrated into EffectChain
    Ok(())
}

/// Enable or disable an effect
#[tauri::command]
pub async fn set_effect_enabled(effect: String, enabled: bool) -> Result<(), String> {
    EFFECT_CHAIN
        .set_effect_enabled(&effect, enabled)
        .await
}

/// Get all effect settings
#[tauri::command]
pub async fn get_effect_settings() -> Result<EffectSettings, String> {
    Ok(EFFECT_CHAIN.get_settings().await)
}

/// Apply equalizer preset
#[tauri::command]
pub async fn apply_equalizer_preset(preset: String) -> Result<(), String> {
    let presets: std::collections::HashMap<&str, [f32; 10]> = [
        ("flat", [0.0; 10]),
        ("bass_boost", [6.0, 5.0, 4.0, 2.0, 0.0, -1.0, -1.0, -1.0, -1.0, -2.0]),
        ("treble_boost", [-2.0, -2.0, -1.0, -1.0, 0.0, 1.0, 2.0, 4.0, 5.0, 6.0]),
        ("vocal", [-2.0, -1.0, 0.0, 2.0, 4.0, 5.0, 4.0, 2.0, 0.0, -1.0]),
        ("rock", [5.0, 4.0, 3.0, 1.0, -1.0, -1.0, 0.0, 2.0, 3.0, 4.0]),
        ("electronic", [4.0, 3.0, 2.0, 0.0, 1.0, 2.0, 3.0, 4.0, 4.0, 3.0]),
        ("classical", [4.0, 3.0, 2.0, 1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 3.0]),
        ("jazz", [3.0, 2.0, 1.0, 2.0, 2.0, 0.0, -1.0, -1.0, 1.0, 2.0]),
    ]
    .iter()
    .cloned()
    .collect();

    let gains = presets
        .get(preset.as_str())
        .ok_or_else(|| format!("Unknown preset: {}", preset))?;

    for (i, &gain) in gains.iter().enumerate() {
        EFFECT_CHAIN.set_equalizer_band(i, gain).await?;
    }

    Ok(())
}

/// Get available equalizer presets
#[tauri::command]
pub async fn get_equalizer_presets() -> Result<Vec<String>, String> {
    Ok(vec![
        "flat".to_string(),
        "bass_boost".to_string(),
        "treble_boost".to_string(),
        "vocal".to_string(),
        "rock".to_string(),
        "electronic".to_string(),
        "classical".to_string(),
        "jazz".to_string(),
    ])
}

/// Get available reverb presets
#[tauri::command]
pub async fn get_reverb_presets() -> Result<Vec<(String, String)>, String> {
    Ok(vec![
        ("small_room".to_string(), "Small Room".to_string()),
        ("medium_room".to_string(), "Medium Room".to_string()),
        ("large_room".to_string(), "Large Room".to_string()),
        ("large_hall".to_string(), "Large Hall".to_string()),
        ("cathedral".to_string(), "Cathedral".to_string()),
        ("plate".to_string(), "Plate".to_string()),
        ("spring".to_string(), "Spring".to_string()),
    ])
}
