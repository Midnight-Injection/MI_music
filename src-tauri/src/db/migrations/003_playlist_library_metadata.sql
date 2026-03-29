ALTER TABLE playlists ADD COLUMN system_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_playlists_system_key ON playlists(system_key);

ALTER TABLE songs ADD COLUMN songmid TEXT;
ALTER TABLE songs ADD COLUMN hash TEXT;
ALTER TABLE songs ADD COLUMN str_media_mid TEXT;
ALTER TABLE songs ADD COLUMN copyright_id TEXT;
ALTER TABLE songs ADD COLUMN album_id TEXT;
