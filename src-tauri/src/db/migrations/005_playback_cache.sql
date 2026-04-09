CREATE TABLE IF NOT EXISTS playback_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_key TEXT NOT NULL,
    audio_quality TEXT NOT NULL,
    remote_url TEXT,
    local_file_path TEXT,
    source_id TEXT,
    channel TEXT,
    resolver TEXT,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    last_verified_at TEXT,
    last_accessed_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(track_key, audio_quality)
);

CREATE INDEX IF NOT EXISTS idx_playback_cache_track_quality
    ON playback_cache(track_key, audio_quality);

CREATE INDEX IF NOT EXISTS idx_playback_cache_last_accessed
    ON playback_cache(last_accessed_at);

CREATE INDEX IF NOT EXISTS idx_playback_cache_local_file
    ON playback_cache(local_file_path);
