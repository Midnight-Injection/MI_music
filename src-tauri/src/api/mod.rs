// API module for music source integrations
// This module handles API calls to various music sources

mod source;
pub mod kuwo;

pub use source::{
    MusicSource, MusicInfo, LyricInfo, Quality, QualityInfo, MusicSourceError, Result
};
pub use kuwo::KuwoSource;

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

        Self { sources }
    }

    /// Get a music source by name
    pub fn get_source(&self, name: &str) -> Option<&dyn MusicSource> {
        self.sources.get(name).map(|source| source.as_ref())
    }

    /// Get all registered source names
    pub fn list_sources(&self) -> Vec<String> {
        self.sources.keys().cloned().collect()
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

        // Test that Kuwo source is registered
        assert!(registry.has_source("kw"));
        assert!(!registry.has_source("invalid"));

        // Test getting source
        let source = registry.get_source("kw");
        assert!(source.is_some());
        assert_eq!(source.unwrap().source_name(), "kw");

        // Test listing sources
        let sources = registry.list_sources();
        assert!(sources.contains(&"kw".to_string()));
    }
}
