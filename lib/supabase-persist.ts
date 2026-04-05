import type { SupabaseClient } from "@supabase/supabase-js";
import type { VoiceProfile, Goal } from "@/lib/voice-engine";
import type { ContentItem, Theme } from "@/lib/engine-types";

const DEFAULT_VOICE: VoiceProfile = {
  rules: [],
  anti_patterns: [],
  vocabulary: [],
  examples: [],
  version: 0,
};

export function isBrowserSupabaseConfigured(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function rowToContent(row: Record<string, unknown>): ContentItem {
  const p = (row.ai_params as Record<string, unknown> | null) || {};
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : undefined,
    channel: String(row.channel),
    pillar: row.pillar != null ? String(row.pillar) : "",
    status: row.status as ContentItem["status"],
    body: String(row.body),
    original_body: row.original_body != null ? String(row.original_body) : undefined,
    theme: row.theme != null ? String(row.theme) : "",
    rating: typeof p.rating === "number" ? p.rating : undefined,
    feedback_note:
      typeof p.feedback_note === "string" ? p.feedback_note : undefined,
    voice_version:
      typeof p.voice_version === "number" ? p.voice_version : undefined,
  };
}

export function contentToInsert(c: ContentItem) {
  const ai_params: Record<string, unknown> = {};
  if (c.rating != null) ai_params.rating = c.rating;
  if (c.feedback_note) ai_params.feedback_note = c.feedback_note;
  if (c.voice_version != null) ai_params.voice_version = c.voice_version;

  return {
    id: c.id,
    channel: c.channel,
    pillar: c.pillar || null,
    status: c.status,
    body: c.body,
    original_body: c.original_body ?? null,
    theme: c.theme || null,
    scheduled_at: c.scheduled_at ?? null,
    created_at: c.created_at,
    ai_params: Object.keys(ai_params).length ? ai_params : {},
  };
}

export function rowToVoice(row: Record<string, unknown>): VoiceProfile {
  return {
    id: String(row.id),
    rules: (row.rules as string[]) || [],
    anti_patterns: (row.anti_patterns as string[]) || [],
    vocabulary: (row.vocabulary as string[]) || [],
    examples: (row.examples as VoiceProfile["examples"]) || [],
    version: typeof row.version === "number" ? row.version : 0,
  };
}

export function voiceToUpdate(v: VoiceProfile) {
  return {
    rules: v.rules,
    anti_patterns: v.anti_patterns,
    vocabulary: v.vocabulary,
    examples: v.examples,
    version: v.version,
  };
}

export function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: String(row.id),
    type: row.type as Goal["type"],
    target_metric: String(row.target_metric ?? ""),
    target_value: Number(row.target_value ?? 0),
    current_value: Number(row.current_value ?? 0),
    strategy_notes: String(row.strategy_notes ?? ""),
    status: row.status as Goal["status"],
    period_start: String(row.period_start ?? "").slice(0, 10),
    period_end: String(row.period_end ?? "").slice(0, 10),
  };
}

export function goalToRow(g: Goal) {
  return {
    id: g.id,
    type: g.type,
    target_metric: g.target_metric,
    target_value: g.target_value,
    current_value: g.current_value,
    strategy_notes: g.strategy_notes,
    status: g.status,
    period_start: g.period_start || null,
    period_end: g.period_end || null,
  };
}

export function rowToTheme(row: Record<string, unknown>): Theme {
  return {
    id: String(row.id),
    title: String(row.title),
    hook: row.hook != null ? String(row.hook) : "",
    pillar: row.pillar != null ? String(row.pillar) : "",
    source: row.source != null ? String(row.source) : "",
    source_url: row.source_url != null ? String(row.source_url) : undefined,
    relevance: typeof row.relevance === "number" ? row.relevance : 0.5,
    curated: Boolean(row.curated),
    used: Boolean(row.used),
  };
}

export function themeToRow(t: Theme) {
  return {
    id: t.id,
    title: t.title,
    hook: t.hook || null,
    pillar: t.pillar || null,
    source: t.source || null,
    source_url: t.source_url ?? null,
    relevance: t.relevance,
    curated: t.curated,
    used: t.used,
  };
}

export async function ensureVoiceRow(
  sb: SupabaseClient
): Promise<{ id: string; profile: VoiceProfile }> {
  const { data: existing, error: selErr } = await sb
    .from("voice_profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1);

  if (selErr) throw selErr;

  const first = existing?.[0];
  if (first) {
    return { id: String(first.id), profile: rowToVoice(first as any) };
  }

  const { data: inserted, error: insErr } = await sb
    .from("voice_profiles")
    .insert({
      rules: [],
      anti_patterns: [],
      vocabulary: [],
      examples: [],
      version: 0,
    })
    .select("*")
    .single();

  if (insErr) throw insErr;
  return { id: String(inserted.id), profile: rowToVoice(inserted as any) };
}

export async function loadCloudState(sb: SupabaseClient): Promise<{
  contentList: ContentItem[];
  goals: Goal[];
  themes: Theme[];
}> {
  const [contentRes, goalsRes, themesRes] = await Promise.all([
    sb.from("content").select("*").order("created_at", { ascending: false }),
    sb.from("goals").select("*").order("created_at", { ascending: false }),
    sb.from("themes").select("*").order("created_at", { ascending: false }),
  ]);

  if (contentRes.error) throw contentRes.error;
  if (goalsRes.error) throw goalsRes.error;
  if (themesRes.error) throw themesRes.error;

  return {
    contentList: (contentRes.data || []).map((r) =>
      rowToContent(r as Record<string, unknown>)
    ),
    goals: (goalsRes.data || []).map((r) =>
      rowToGoal(r as Record<string, unknown>)
    ),
    themes: (themesRes.data || []).map((r) =>
      rowToTheme(r as Record<string, unknown>)
    ),
  };
}

const LS_KEYS = {
  voice: "ce-voice-profile",
  content: "ce-content",
  goals: "ce-goals",
  themes: "ce-themes",
} as const;

export async function migrateLocalStorageToSupabase(
  sb: SupabaseClient,
  voiceRowId: string
): Promise<boolean> {
  let voiceProfile: VoiceProfile | null = null;
  let contentList: ContentItem[] = [];
  let goals: Goal[] = [];
  let themes: Theme[] = [];

  try {
    const v = localStorage.getItem(LS_KEYS.voice);
    if (v) {
      const parsed = JSON.parse(v) as Partial<VoiceProfile>;
      if (parsed && typeof parsed === "object") {
        voiceProfile = {
          ...DEFAULT_VOICE,
          ...parsed,
          rules: Array.isArray(parsed.rules) ? parsed.rules : [],
          anti_patterns: Array.isArray(parsed.anti_patterns)
            ? parsed.anti_patterns
            : [],
          vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
          examples: Array.isArray(parsed.examples) ? parsed.examples : [],
          version: typeof parsed.version === "number" ? parsed.version : 0,
        };
      }
    }
  } catch {}

  try {
    const c = localStorage.getItem(LS_KEYS.content);
    if (c) {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed)) contentList = parsed;
    }
  } catch {}

  try {
    const g = localStorage.getItem(LS_KEYS.goals);
    if (g) {
      const parsed = JSON.parse(g);
      if (Array.isArray(parsed)) goals = parsed;
    }
  } catch {}

  try {
    const t = localStorage.getItem(LS_KEYS.themes);
    if (t) {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) themes = parsed;
    }
  } catch {}

  const hadLocalData =
    contentList.length > 0 ||
    goals.length > 0 ||
    themes.length > 0 ||
    voiceProfile != null;

  if (!hadLocalData) return false;

  if (voiceProfile) {
    const { error } = await sb
      .from("voice_profiles")
      .update(voiceToUpdate(voiceProfile))
      .eq("id", voiceRowId);
    if (error) console.error("Supabase migrate voice:", error.message);
  }

  for (const item of contentList) {
    const { error } = await sb.from("content").upsert(contentToInsert(item), {
      onConflict: "id",
    });
    if (error) console.error("Supabase migrate content:", error.message);
  }

  for (const g of goals) {
    const { error } = await sb.from("goals").upsert(goalToRow(g), {
      onConflict: "id",
    });
    if (error) console.error("Supabase migrate goals:", error.message);
  }

  for (const th of themes) {
    const withId = { ...th, id: th.id || crypto.randomUUID() };
    const { error } = await sb.from("themes").upsert(themeToRow(withId), {
      onConflict: "id",
    });
    if (error) console.error("Supabase migrate themes:", error.message);
  }

  try {
    localStorage.removeItem(LS_KEYS.content);
    localStorage.removeItem(LS_KEYS.goals);
    localStorage.removeItem(LS_KEYS.themes);
    if (voiceProfile) localStorage.removeItem(LS_KEYS.voice);
  } catch {}

  return true;
}
