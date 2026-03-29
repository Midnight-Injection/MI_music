// Tauri commands for audio effects control

use crate::effects::{EffectChain, EffectSettings};
use std::sync::Arc;

lazy_static::lazy_static! {
    static ref EFFECT_CHAIN: Arc<EffectChain> = Arc::new(EffectChain::new());
}

/// Set gain for a specific equalizer band
#[tauri::command]
pub async fn set_equalizer_band(band: usize, gain: f32) -> Result<(), String> {
    EFFECT_CHAIN.set_equalizer_band(band, gain).await
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
    EFFECT_CHAIN.set_reverb_preset(&preset).await
}

/// Enable or disable an effect
#[tauri::command]
pub async fn set_effect_enabled(effect: String, enabled: bool) -> Result<(), String> {
    EFFECT_CHAIN.set_effect_enabled(&effect, enabled).await
}

/// Get all effect settings
#[tauri::command]
pub async fn get_effect_settings() -> Result<EffectSettings, String> {
    Ok(EFFECT_CHAIN.get_settings().await)
}

/// Apply equalizer preset
#[tauri::command]
pub async fn apply_equalizer_preset(preset: String) -> Result<(), String> {
    EFFECT_CHAIN.apply_equalizer_preset(&preset).await
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
    Ok(crate::effects::Reverb::get_preset_names()
        .into_iter()
        .map(|(value, label)| (value.to_string(), label.to_string()))
        .collect())
}
