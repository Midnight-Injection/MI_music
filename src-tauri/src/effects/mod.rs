// Audio effects module for Jiyu Music
// Provides equalizer, reverb, and other audio processing effects

pub mod equalizer;
pub mod reverb;

pub use equalizer::Equalizer;
pub use reverb::Reverb;

use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock as StdRwLock};
use tokio::sync::RwLock;

/// Master effect settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectSettings {
    pub equalizer_enabled: bool,
    pub reverb_enabled: bool,
    pub equalizer_bands: [f32; 10],
    pub reverb_mix: f32,
    pub reverb_preset: String,
}

impl Default for EffectSettings {
    fn default() -> Self {
        Self {
            equalizer_enabled: false,
            reverb_enabled: false,
            equalizer_bands: [0.0; 10],
            reverb_mix: 0.3,
            reverb_preset: "medium_room".to_string(),
        }
    }
}

/// Effect chain manager
pub struct EffectChain {
    settings: Arc<RwLock<EffectSettings>>,
    equalizer: Option<Arc<StdRwLock<Equalizer>>>,
    reverb: Option<Arc<StdRwLock<Reverb>>>,
}

impl EffectChain {
    pub fn new() -> Self {
        Self {
            settings: Arc::new(RwLock::new(EffectSettings::default())),
            equalizer: None,
            reverb: None,
        }
    }

    pub async fn get_settings(&self) -> EffectSettings {
        self.settings.read().await.clone()
    }

    pub async fn set_equalizer_band(&self, band: usize, gain: f32) -> Result<(), String> {
        if band >= 10 {
            return Err("Band index must be between 0 and 9".to_string());
        }

        let clamped_gain = gain.max(-12.0).min(12.0);
        let mut settings = self.settings.write().await;
        settings.equalizer_bands[band] = clamped_gain;

        if let Some(eq) = &self.equalizer {
            if let Ok(mut eq_guard) = eq.write() {
                eq_guard.set_band(band, clamped_gain);
            }
        }

        Ok(())
    }

    pub async fn reset_equalizer(&self) -> Result<(), String> {
        let mut settings = self.settings.write().await;
        settings.equalizer_bands = [0.0; 10];

        if let Some(eq) = &self.equalizer {
            if let Ok(mut eq_guard) = eq.write() {
                eq_guard.reset();
            }
        }

        Ok(())
    }

    pub async fn set_reverb_mix(&self, mix: f32) -> Result<(), String> {
        let clamped_mix = mix.max(0.0).min(1.0);
        let mut settings = self.settings.write().await;
        settings.reverb_mix = clamped_mix;

        if let Some(rvb) = &self.reverb {
            if let Ok(mut rvb_guard) = rvb.write() {
                rvb_guard.set_mix(clamped_mix);
            }
        }

        Ok(())
    }

    pub async fn set_effect_enabled(&self, effect: &str, enabled: bool) -> Result<(), String> {
        let mut settings = self.settings.write().await;

        match effect {
            "equalizer" => {
                settings.equalizer_enabled = enabled;
            }
            "reverb" => {
                settings.reverb_enabled = enabled;
            }
            _ => return Err(format!("Unknown effect: {}", effect)),
        }

        Ok(())
    }
}

impl Default for EffectChain {
    fn default() -> Self {
        Self::new()
    }
}
