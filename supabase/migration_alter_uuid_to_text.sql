-- Só rode se você já criou as tabelas com UUID e precisa alinhar ao app (ids texto).
-- Faça backup antes. Ordem importa por causa de FKs.

-- Analytics: remover FK, alterar tipo, recriar FK
ALTER TABLE analytics DROP CONSTRAINT IF EXISTS analytics_content_id_fkey;
ALTER TABLE analytics ALTER COLUMN content_id TYPE TEXT USING content_id::text;

ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_content_id_fkey;
ALTER TABLE feedback ALTER COLUMN content_id TYPE TEXT USING content_id::text;

ALTER TABLE content ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE goals ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE themes ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE analytics
  ADD CONSTRAINT analytics_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE;

ALTER TABLE feedback
  ADD CONSTRAINT feedback_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE;

-- Garantir upsert por post em analytics (cron)
CREATE UNIQUE INDEX IF NOT EXISTS analytics_content_id_key ON analytics (content_id);
