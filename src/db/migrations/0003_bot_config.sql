-- bot_config is consumed by counseller/server only. The plugin-mode hook
-- ignores this table entirely. Token is stored plaintext per V1 project
-- decision; future work could move to secrets manager.

CREATE TABLE IF NOT EXISTS bot_config (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  bot_token TEXT,
  target_chat_id TEXT,
  webhook_secret TEXT,
  last_processed_update_id INTEGER,
  last_error TEXT,
  last_connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO bot_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
