// Reverb effect implementation
// Provides convolution-based reverb with preset room simulations

/// Reverb effect with mix control
pub struct Reverb {
    mix: f32,        // 0.0 = dry, 1.0 = wet
    room_size: f32,  // 0.0 to 1.0
    decay_time: f32, // in seconds
    damping: f32,    // 0.0 to 1.0
}

impl Reverb {
    /// Create a new reverb effect
    pub fn new() -> Self {
        Self {
            mix: 0.3,
            room_size: 0.5,
            decay_time: 1.5,
            damping: 0.5,
        }
    }

    /// Set wet/dry mix (0.0 to 1.0)
    pub fn set_mix(&mut self, mix: f32) {
        self.mix = mix.max(0.0).min(1.0);
    }

    /// Get current mix
    pub fn get_mix(&self) -> f32 {
        self.mix
    }

    /// Set room size (0.0 to 1.0)
    pub fn set_room_size(&mut self, size: f32) {
        self.room_size = size.max(0.0).min(1.0);
    }

    /// Set decay time in seconds
    pub fn set_decay_time(&mut self, decay: f32) {
        self.decay_time = decay.max(0.1).min(10.0);
    }

    /// Set high-frequency damping (0.0 to 1.0)
    pub fn set_damping(&mut self, damping: f32) {
        self.damping = damping.max(0.0).min(1.0);
    }

    /// Apply reverb preset
    pub fn apply_preset(&mut self, preset: &str) {
        match preset {
            "small_room" => {
                self.room_size = 0.3;
                self.decay_time = 0.5;
                self.damping = 0.7;
                self.mix = 0.2;
            }
            "medium_room" => {
                self.room_size = 0.5;
                self.decay_time = 1.0;
                self.damping = 0.5;
                self.mix = 0.3;
            }
            "large_room" => {
                self.room_size = 0.7;
                self.decay_time = 1.5;
                self.damping = 0.4;
                self.mix = 0.35;
            }
            "large_hall" => {
                self.room_size = 0.85;
                self.decay_time = 2.2;
                self.damping = 0.3;
                self.mix = 0.4;
            }
            "cathedral" => {
                self.room_size = 1.0;
                self.decay_time = 3.5;
                self.damping = 0.2;
                self.mix = 0.45;
            }
            "plate" => {
                self.room_size = 0.6;
                self.decay_time = 1.8;
                self.damping = 0.6;
                self.mix = 0.35;
            }
            "spring" => {
                self.room_size = 0.4;
                self.decay_time = 0.8;
                self.damping = 0.8;
                self.mix = 0.25;
            }
            _ => {
                // Default to medium room
                self.room_size = 0.5;
                self.decay_time = 1.0;
                self.damping = 0.5;
                self.mix = 0.3;
            }
        }
    }

    /// Get all reverb parameters
    pub fn get_parameters(&self) -> ReverbParameters {
        ReverbParameters {
            mix: self.mix,
            room_size: self.room_size,
            decay_time: self.decay_time,
            damping: self.damping,
        }
    }

    /// Get available presets
    pub fn get_presets() -> Vec<&'static str> {
        vec![
            "small_room",
            "medium_room",
            "large_room",
            "large_hall",
            "cathedral",
            "plate",
            "spring",
        ]
    }

    /// Get preset display names
    pub fn get_preset_names() -> Vec<(&'static str, &'static str)> {
        vec![
            ("small_room", "Small Room"),
            ("medium_room", "Medium Room"),
            ("large_room", "Large Room"),
            ("large_hall", "Large Hall"),
            ("cathedral", "Cathedral"),
            ("plate", "Plate"),
            ("spring", "Spring"),
        ]
    }
}

impl Default for Reverb {
    fn default() -> Self {
        Self::new()
    }
}

/// Reverb parameters for serialization
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ReverbParameters {
    pub mix: f32,
    pub room_size: f32,
    pub decay_time: f32,
    pub damping: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reverb_creation() {
        let reverb = Reverb::new();
        assert_eq!(reverb.get_mix(), 0.3);
    }

    #[test]
    fn test_reverb_mix() {
        let mut reverb = Reverb::new();
        reverb.set_mix(0.5);
        assert_eq!(reverb.get_mix(), 0.5);

        // Test clamping
        reverb.set_mix(1.5);
        assert_eq!(reverb.get_mix(), 1.0);

        reverb.set_mix(-0.5);
        assert_eq!(reverb.get_mix(), 0.0);
    }

    #[test]
    fn test_reverb_presets() {
        let mut reverb = Reverb::new();
        reverb.apply_preset("cathedral");
        assert!(reverb.get_mix() > 0.4);
        assert_eq!(reverb.room_size, 1.0);
    }
}
