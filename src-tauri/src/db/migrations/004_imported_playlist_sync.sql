ALTER TABLE playlists ADD COLUMN import_source TEXT;
ALTER TABLE playlists ADD COLUMN import_source_playlist_id TEXT;
ALTER TABLE playlists ADD COLUMN import_source_playlist_url TEXT;
ALTER TABLE playlists ADD COLUMN last_synced_at TEXT;

CREATE INDEX IF NOT EXISTS idx_playlists_import_source
ON playlists(import_source, import_source_playlist_id);
