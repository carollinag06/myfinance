ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_google_sub_unique ON usuarios (google_sub);
