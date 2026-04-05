-- Content Engine — Supabase Schema
-- Run this in Supabase SQL Editor when ready to migrate from localStorage

-- Voice Profile
CREATE TABLE voice_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  rules JSONB DEFAULT '[]'::jsonb,
  anti_patterns JSONB DEFAULT '[]'::jsonb,
  vocabulary JSONB DEFAULT '[]'::jsonb,
  examples JSONB DEFAULT '[]'::jsonb,
  version INT DEFAULT 0
);

-- Content (posts) — TEXT id matches app-generated keys (timestamp-based, agent-*, etc.)
CREATE TABLE content (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  channel TEXT NOT NULL CHECK (channel IN ('linkedin', 'twitter', 'instagram')),
  pillar TEXT CHECK (pillar IN ('ai_business', 'alternative_assets', 'entrepreneurship')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'scheduled', 'published', 'rejected', 'archived')),
  body TEXT NOT NULL,
  original_body TEXT,
  theme TEXT,
  visual_brief TEXT,
  visual_url TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_params JSONB DEFAULT '{}'::jsonb
);

-- Feedback
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('approved', 'rejected', 'edited')),
  original_text TEXT,
  edited_text TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  voice_learnings JSONB DEFAULT '{}'::jsonb
);

-- Analytics
CREATE TABLE analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  content_id TEXT REFERENCES content(id) ON DELETE CASCADE,
  channel TEXT,
  impressions INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  clicks INT DEFAULT 0,
  engagement_rate FLOAT DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (content_id)
);

-- Goals
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  period_start DATE,
  period_end DATE,
  type TEXT CHECK (type IN ('growth', 'engagement', 'authority', 'leads')),
  target_metric TEXT,
  target_value FLOAT,
  current_value FLOAT DEFAULT 0,
  strategy_notes TEXT,
  ai_recommendations JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused'))
);

-- Themes
CREATE TABLE themes (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  hook TEXT,
  pillar TEXT CHECK (pillar IN ('ai_business', 'alternative_assets', 'entrepreneurship')),
  source TEXT,
  source_url TEXT,
  relevance FLOAT DEFAULT 0.5,
  curated BOOLEAN DEFAULT false,
  used BOOLEAN DEFAULT false,
  notes TEXT
);

-- Indexes
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_channel ON content(channel);
CREATE INDEX idx_feedback_content ON feedback(content_id);
CREATE INDEX idx_analytics_content ON analytics(content_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_themes_curated ON themes(curated);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_updated_at BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER voice_profiles_updated_at BEFORE UPDATE ON voice_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
