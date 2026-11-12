CREATE TABLE IF NOT EXISTS password_reset_tokens (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  solicitado_em TIMESTAMPTZ NOT NULL
);
