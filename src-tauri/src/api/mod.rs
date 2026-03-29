// API module for music source integrations
// This module handles API calls to various music sources

pub mod helpers;
pub mod kugou;
pub mod kuwo;
pub mod migu;
pub mod netease;
pub mod qq;
mod source;

pub use kugou::KugouSource;
pub use kuwo::KuwoSource;
pub use migu::MiguSource;
pub use netease::NeteaseSource;
pub use qq::QqSource;
pub use source::{
    LyricInfo, MusicInfo, MusicSource, Quality, QualityInfo, SourcePlaylistDetail,
    SourcePlaylistSummary,
};

use std::collections::HashMap;

/// Music source registry
pub struct SourceRegistry {
    sources: HashMap<String, Box<dyn MusicSource>>,
}

impl SourceRegistry {
    /// Create a new source registry with default sources
    pub fn new() -> Self {
        let mut sources: HashMap<String, Box<dyn MusicSource>> = HashMap::new();

        // Register Kuwo source
        sources.insert("kw".to_string(), Box::new(KuwoSource::new()));
        sources.insert("kg".to_string(), Box::new(KugouSource::new()));
        sources.insert("wy".to_string(), Box::new(NeteaseSource::new()));
        sources.insert("tx".to_string(), Box::new(QqSource::new()));
        sources.insert("mg".to_string(), Box::new(MiguSource::new()));

        Self { sources }
    }

    /// Get a music source by name
    pub fn get_source(&self, name: &str) -> Option<&dyn MusicSource> {
        self.sources.get(name).map(|source| source.as_ref())
    }

    /// Get all registered source names
    pub fn list_sources(&self) -> Vec<String> {
        self.sources
            .values()
            .map(|source| source.source_name().to_string())
            .collect()
    }

    /// Check if a source is registered
    pub fn has_source(&self, name: &str) -> bool {
        self.sources.contains_key(name)
    }
}

impl Default for SourceRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_source_registry() {
        let registry = SourceRegistry::new();

        // Test that all built-in sources are registered
        assert!(registry.has_source("kw"));
        assert!(registry.has_source("kg"));
        assert!(registry.has_source("wy"));
        assert!(registry.has_source("tx"));
        assert!(registry.has_source("mg"));
        assert!(!registry.has_source("invalid"));

        // Test getting source
        let source = registry.get_source("kw");
        assert!(source.is_some());
        assert_eq!(source.unwrap().source_name(), "kw");

        // Test listing sources
        let sources = registry.list_sources();
        assert!(sources.contains(&"kw".to_string()));
        assert!(sources.contains(&"kg".to_string()));
        assert!(sources.contains(&"wy".to_string()));
        assert!(sources.contains(&"tx".to_string()));
        assert!(sources.contains(&"mg".to_string()));
    }
}
