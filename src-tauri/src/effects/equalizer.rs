// 10-band equalizer implementation
// ISO standard frequency bands: 31, 62, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz

/// 10-band graphic equalizer
pub struct Equalizer {
    bands: [f32; 10],
    // Frequency bands in Hz
    frequencies: [f32; 10],
}

impl Equalizer {
    /// Create a new equalizer with flat response
    pub fn new() -> Self {
        Self {
            bands: [0.0; 10],
            frequencies: [
                31.0,   // Band 0: 31 Hz (Sub-bass)
                62.0,   // Band 1: 62 Hz (Bass)
                125.0,  // Band 2: 125 Hz (Low bass)
                250.0,  // Band 3: 250 Hz (Upper bass)
                500.0,  // Band 4: 500 Hz (Low mids)
                1000.0, // Band 5: 1 kHz (Mids)
                2000.0, // Band 6: 2 kHz (Upper mids)
                4000.0, // Band 7: 4 kHz (Presence)
                8000.0, // Band 8: 8 kHz (Highs)
                16000.0,// Band 9: 16 kHz (Ultra highs)
            ],
        }
    }

    /// Set gain for a specific band (-12dB to +12dB)
    pub fn set_band(&mut self, band: usize, gain: f32) {
        if band < 10 {
            self.bands[band] = gain.max(-12.0).min(12.0);
        }
    }

    /// Get gain for a specific band
    pub fn get_band(&self, band: usize) -> f32 {
        if band < 10 {
            self.bands[band]
        } else {
            0.0
        }
    }

    /// Reset all bands to flat (0dB)
    pub fn reset(&mut self) {
        self.bands = [0.0; 10];
    }

    /// Get all band gains
    pub fn get_all_bands(&self) -> [f32; 10] {
        self.bands
    }

    /// Get band frequencies
    pub fn get_frequencies(&self) -> [f32; 10] {
        self.frequencies
    }

    /// Get frequency labels for UI display
    pub fn get_frequency_labels(&self) -> [&'static str; 10] {
        [
            "31", "62", "125", "250", "500", "1k", "2k", "4k", "8k", "16k"
        ]
    }

    /// Apply EQ preset
    pub fn apply_preset(&mut self, preset: &str) {
        let gains = match preset {
            "flat" => [0.0; 10],
            "bass_boost" => [6.0, 5.0, 4.0, 2.0, 0.0, -1.0, -1.0, -1.0, -1.0, -2.0],
            "treble_boost" => [-2.0, -2.0, -1.0, -1.0, 0.0, 1.0, 2.0, 4.0, 5.0, 6.0],
            "vocal" => [-2.0, -1.0, 0.0, 2.0, 4.0, 5.0, 4.0, 2.0, 0.0, -1.0],
            "rock" => [5.0, 4.0, 3.0, 1.0, -1.0, -1.0, 0.0, 2.0, 3.0, 4.0],
            "electronic" => [4.0, 3.0, 2.0, 0.0, 1.0, 2.0, 3.0, 4.0, 4.0, 3.0],
            "classical" => [4.0, 3.0, 2.0, 1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 3.0],
            "jazz" => [3.0, 2.0, 1.0, 2.0, 2.0, 0.0, -1.0, -1.0, 1.0, 2.0],
            _ => [0.0; 10],
        };

        self.bands = gains;
    }

    /// Convert linear gain to dB
    pub fn linear_to_db(linear: f32) -> f32 {
        20.0 * linear.log10().max(-100.0)
    }

    /// Convert dB to linear gain
    pub fn db_to_linear(db: f32) -> f32 {
        10.0_f32.powf(db / 20.0)
    }
}

impl Default for Equalizer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_equalizer_bands() {
        let mut eq = Equalizer::new();
        assert_eq!(eq.get_all_bands(), [0.0; 10]);

        eq.set_band(0, 6.0);
        assert_eq!(eq.get_band(0), 6.0);

        // Test clamping
        eq.set_band(1, 20.0);
        assert_eq!(eq.get_band(1), 12.0);

        eq.set_band(2, -20.0);
        assert_eq!(eq.get_band(2), -12.0);
    }

    #[test]
    fn test_equalizer_reset() {
        let mut eq = Equalizer::new();
        eq.set_band(0, 6.0);
        eq.set_band(5, -3.0);
        eq.reset();
        assert_eq!(eq.get_all_bands(), [0.0; 10]);
    }

    #[test]
    fn test_db_conversion() {
        assert!((Equalizer::db_to_linear(0.0) - 1.0).abs() < 0.001);
        assert!((Equalizer::db_to_linear(6.0) - 1.995).abs() < 0.01);
        assert!((Equalizer::linear_to_db(1.0) - 0.0).abs() < 0.001);
    }
}
