-- RLS para o client browser (chave anon) conseguir ler/escrever.
-- Uso: app single-tenant / confiável — a chave anon já aparece no frontend.
-- Para multiusuário público, troque por Supabase Auth e políticas por user_id.

ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ce_voice_rw ON voice_profiles;
CREATE POLICY ce_voice_rw ON voice_profiles FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ce_content_rw ON content;
CREATE POLICY ce_content_rw ON content FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ce_goals_rw ON goals;
CREATE POLICY ce_goals_rw ON goals FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ce_themes_rw ON themes;
CREATE POLICY ce_themes_rw ON themes FOR ALL TO anon USING (true) WITH CHECK (true);
