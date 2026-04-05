"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { VoiceProfile, Goal } from "@/lib/voice-engine";
import type { ContentItem, Theme } from "@/lib/engine-types";
import {
  isBrowserSupabaseConfigured,
  ensureVoiceRow,
  loadCloudState,
  migrateLocalStorageToSupabase,
  voiceToUpdate,
  contentToInsert,
  goalToRow,
  themeToRow,
} from "@/lib/supabase-persist";

export type { ContentItem, Theme } from "@/lib/engine-types";

const DEFAULT_VOICE: VoiceProfile = {
  rules: [],
  anti_patterns: [],
  vocabulary: [],
  examples: [],
  version: 0,
};

const LS = {
  voice: "ce-voice-profile",
  content: "ce-content",
  goals: "ce-goals",
  themes: "ce-themes",
} as const;

export function useContentEngine() {
  const useCloudRef = useRef(isBrowserSupabaseConfigured());
  const useCloud = useCloudRef.current;

  const [voiceProfile, setVoiceProfileState] =
    useState<VoiceProfile>(DEFAULT_VOICE);
  const [contentList, setContentListState] = useState<ContentItem[]>([]);
  const [goals, setGoalsState] = useState<Goal[]>([]);
  const [themes, setThemesState] = useState<Theme[]>([]);
  const [loaded, setLoaded] = useState(false);

  const voiceRowIdRef = useRef<string | null>(null);
  const voiceHydratedRef = useRef(false);
  const voicePersistSkipRef = useRef(true);

  // --- Hydrate: Supabase ---
  useEffect(() => {
    if (!useCloud) return;

    let cancelled = false;
    (async () => {
      try {
        const sb = createBrowserClient();
        const { id: voiceId, profile } = await ensureVoiceRow(sb);
        if (cancelled) return;
        voiceRowIdRef.current = voiceId;
        setVoiceProfileState(profile);

        let { contentList: cl, goals: gl, themes: th } =
          await loadCloudState(sb);
        if (cancelled) return;

        const noUserTables =
          cl.length === 0 && gl.length === 0 && th.length === 0;

        if (noUserTables) {
          await migrateLocalStorageToSupabase(sb, voiceId);
          if (cancelled) return;
          const again = await loadCloudState(sb);
          cl = again.contentList;
          gl = again.goals;
          th = again.themes;
          const { data: vrow } = await sb
            .from("voice_profiles")
            .select("*")
            .eq("id", voiceId)
            .single();
          if (vrow && !cancelled) {
            const p = vrow as Record<string, unknown>;
            setVoiceProfileState({
              rules: (p.rules as string[]) || [],
              anti_patterns: (p.anti_patterns as string[]) || [],
              vocabulary: (p.vocabulary as string[]) || [],
              examples:
                (p.examples as VoiceProfile["examples"]) || [],
              version: typeof p.version === "number" ? p.version : 0,
            });
          }
        }

        if (cancelled) return;
        setContentListState(cl);
        setGoalsState(gl);
        setThemesState(th);
        voiceHydratedRef.current = true;
        voicePersistSkipRef.current = true;
      } catch (e) {
        console.error("Supabase load failed:", e);
        voiceHydratedRef.current = true;
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [useCloud]);

  // --- Hydrate: localStorage ---
  useEffect(() => {
    if (useCloud) return;
    try {
      const v = localStorage.getItem(LS.voice);
      if (v) setVoiceProfileState({ ...DEFAULT_VOICE, ...JSON.parse(v) });
      const c = localStorage.getItem(LS.content);
      if (c) setContentListState(JSON.parse(c));
      const g = localStorage.getItem(LS.goals);
      if (g) setGoalsState(JSON.parse(g));
      const t = localStorage.getItem(LS.themes);
      if (t) setThemesState(JSON.parse(t));
    } catch {}
    setLoaded(true);
  }, [useCloud]);

  // --- Mirror localStorage (offline / no Supabase) ---
  useEffect(() => {
    if (useCloud || !loaded) return;
    try {
      localStorage.setItem(LS.voice, JSON.stringify(voiceProfile));
    } catch {}
  }, [voiceProfile, useCloud, loaded]);

  useEffect(() => {
    if (useCloud || !loaded) return;
    try {
      localStorage.setItem(LS.content, JSON.stringify(contentList));
    } catch {}
  }, [contentList, useCloud, loaded]);

  useEffect(() => {
    if (useCloud || !loaded) return;
    try {
      localStorage.setItem(LS.goals, JSON.stringify(goals));
    } catch {}
  }, [goals, useCloud, loaded]);

  useEffect(() => {
    if (useCloud || !loaded) return;
    try {
      localStorage.setItem(LS.themes, JSON.stringify(themes));
    } catch {}
  }, [themes, useCloud, loaded]);

  // --- Persist voice (Supabase) after user edits ---
  useEffect(() => {
    if (!useCloud || !loaded || !voiceRowIdRef.current || !voiceHydratedRef.current)
      return;
    if (voicePersistSkipRef.current) {
      voicePersistSkipRef.current = false;
      return;
    }
    const id = voiceRowIdRef.current;
    const sb = createBrowserClient();
    const t = window.setTimeout(() => {
      void sb
        .from("voice_profiles")
        .update(voiceToUpdate(voiceProfile))
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("voice_profiles update:", error.message);
        });
    }, 400);
    return () => clearTimeout(t);
  }, [voiceProfile, useCloud, loaded]);

  const setVoiceProfile = useCallback(
    (u: VoiceProfile | ((prev: VoiceProfile) => VoiceProfile)) => {
      setVoiceProfileState((prev) =>
        typeof u === "function" ? (u as (p: VoiceProfile) => VoiceProfile)(prev) : u
      );
    },
    []
  );

  const loadedAll = loaded;
  const activeGoal = goals.find((g) => g.status === "active") || null;
  const pendingReview = contentList.filter(
    (c) => c.status === "pending_review"
  );
  const published = contentList.filter(
    (c) => c.status === "approved" || c.status === "published"
  );

  const addContent = useCallback(
    (item: ContentItem) => {
      setContentListState((prev) => [item, ...prev]);
      if (useCloud) {
        const sb = createBrowserClient();
        void sb
          .from("content")
          .insert(contentToInsert(item))
          .then(({ error }) => {
            if (error) console.error("content insert:", error.message);
          });
      }
    },
    [useCloud]
  );

  const updateContent = useCallback(
    (id: string, updates: Partial<ContentItem>) => {
      setContentListState((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
        const row = next.find((c) => c.id === id);
        if (useCloud && row) {
          const sb = createBrowserClient();
          const payload = contentToInsert(row);
          const { id: _cid, ...patch } = payload;
          void sb
            .from("content")
            .update(patch)
            .eq("id", id)
            .then(({ error }) => {
              if (error) console.error("content update:", error.message);
            });
        }
        return next;
      });
    },
    [useCloud]
  );

  const deleteContent = useCallback(
    (id: string) => {
      setContentListState((prev) => prev.filter((c) => c.id !== id));
      if (useCloud) {
        const sb = createBrowserClient();
        void sb
          .from("content")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("content delete:", error.message);
          });
      }
    },
    [useCloud]
  );

  const updateVoiceProfile = useCallback(
    (updates: Partial<VoiceProfile>) => {
      setVoiceProfileState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const addVoiceRule = useCallback((rule: string) => {
    setVoiceProfileState((prev) => ({
      ...prev,
      rules: [...new Set([...prev.rules, rule])],
    }));
  }, []);

  const addAntiPattern = useCallback((pattern: string) => {
    setVoiceProfileState((prev) => ({
      ...prev,
      anti_patterns: [...new Set([...prev.anti_patterns, pattern])],
    }));
  }, []);

  const addVocabulary = useCallback((word: string) => {
    setVoiceProfileState((prev) => ({
      ...prev,
      vocabulary: [...new Set([...prev.vocabulary, word])],
    }));
  }, []);

  const removeVoiceItem = useCallback(
    (field: "rules" | "anti_patterns" | "vocabulary", index: number) => {
      setVoiceProfileState((prev) => ({
        ...prev,
        [field]: prev[field].filter((_: unknown, i: number) => i !== index),
      }));
    },
    []
  );

  const addGoldExample = useCallback(
    (text: string, rating: number, channel?: string) => {
      setVoiceProfileState((prev) => ({
        ...prev,
        examples: [
          ...prev.examples,
          { text, rating, date: new Date().toISOString(), channel },
        ],
        version: prev.version + 1,
      }));
    },
    []
  );

  const resetVoice = useCallback(() => {
    setVoiceProfileState(DEFAULT_VOICE);
    if (useCloud && voiceRowIdRef.current) {
      const sb = createBrowserClient();
      void sb
        .from("voice_profiles")
        .update(voiceToUpdate(DEFAULT_VOICE))
        .eq("id", voiceRowIdRef.current);
    }
  }, [useCloud]);

  const addGoal = useCallback(
    (goal: Goal) => {
      setGoalsState((prev) => {
        const next = [
          goal,
          ...prev.map((g) =>
            g.status === "active" ? { ...g, status: "paused" as const } : g
          ),
        ];
        if (useCloud) {
          const sb = createBrowserClient();
          void sb
            .from("goals")
            .upsert(goalToRow(goal), { onConflict: "id" })
            .then(({ error }) => {
              if (error) console.error("goals upsert (add):", error.message);
            });
          for (const g of prev) {
            if (g.status === "active" && g.id !== goal.id) {
              void sb
                .from("goals")
                .update({ status: "paused" })
                .eq("id", g.id);
            }
          }
        }
        return next;
      });
    },
    [useCloud]
  );

  const toggleGoal = useCallback(
    (id: string) => {
      setGoalsState((prev) => {
        const next = prev.map((g) => {
          if (g.id === id)
            return {
              ...g,
              status: (g.status === "active" ? "paused" : "active") as Goal["status"],
            };
          if (g.status === "active")
            return { ...g, status: "paused" as const };
          return g;
        });
        if (useCloud) {
          const sb = createBrowserClient();
          for (const g of next) {
            void sb
              .from("goals")
              .update({ status: g.status })
              .eq("id", g.id)
              .then(({ error }) => {
                if (error) console.error("goals update:", error.message);
              });
          }
        }
        return next;
      });
    },
    [useCloud]
  );

  const removeGoal = useCallback(
    (id: string) => {
      setGoalsState((prev) => prev.filter((g) => g.id !== id));
      if (useCloud) {
        const sb = createBrowserClient();
        void sb
          .from("goals")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("goals delete:", error.message);
          });
      }
    },
    [useCloud]
  );

  const addThemes = useCallback(
    (newThemes: Theme[]) => {
      const withIds = newThemes.map((t) => ({
        ...t,
        id: t.id || crypto.randomUUID(),
      }));
      setThemesState((prev) => [...withIds, ...prev]);
      if (useCloud) {
        const sb = createBrowserClient();
        for (const t of withIds) {
          void sb
            .from("themes")
            .upsert(themeToRow(t), { onConflict: "id" })
            .then(({ error }) => {
              if (error) console.error("themes upsert:", error.message);
            });
        }
      }
    },
    [useCloud]
  );

  const curateTheme = useCallback(
    (id: string, curated: boolean) => {
      setThemesState((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, curated } : t));
        const row = next.find((t) => t.id === id);
        if (useCloud && row) {
          const sb = createBrowserClient();
          void sb
            .from("themes")
            .update({ curated })
            .eq("id", id)
            .then(({ error }) => {
              if (error) console.error("themes update:", error.message);
            });
        }
        return next;
      });
    },
    [useCloud]
  );

  const generateContent = useCallback(
    async (theme: string, channels: string[]) => {
      const ag = goals.find((g) => g.status === "active") || null;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          channels,
          voiceProfile,
          activeGoal: ag,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.results as Record<string, string>;
    },
    [voiceProfile, goals]
  );

  const analyzeFeedback = useCallback(
    async (original: string, edited: string) => {
      const res = await fetch("/api/analyze-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original,
          edited,
          existingRules: voiceProfile.rules,
        }),
      });
      const data = await res.json();
      return data.analysis;
    },
    [voiceProfile.rules]
  );

  const researchThemes = useCallback(async (pillars?: string[]) => {
    const res = await fetch("/api/research-themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pillars }),
    });
    const data = await res.json();
    return data.themes || [];
  }, []);

  const generateImage = useCallback(
    async (postBody: string, channel: string, customPrompt?: string) => {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postBody, channel, customPrompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data as { prompt: string; url: string | null; message?: string };
    },
    []
  );

  const generateCarousel = useCallback(
    async (theme: string, pillar: string, numSlides?: number) => {
      const res = await fetch("/api/generate-carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, pillar, numSlides, voiceProfile }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.slides as Array<{
        slideNumber: number;
        headline: string;
        body: string;
        accent?: string;
        type: string;
      }>;
    },
    [voiceProfile]
  );

  const analyzePerformance = useCallback(
    async (contentWithMetrics: unknown[]) => {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentWithMetrics,
          goals,
          voiceProfile,
        }),
      });
      const data = await res.json();
      return data.analysis;
    },
    [goals, voiceProfile]
  );

  const connectLinkedIn = useCallback(() => {
    window.location.href = "/api/social/linkedin?action=auth";
  }, []);

  const connectInstagram = useCallback(() => {
    window.location.href = "/api/social/instagram?action=auth";
  }, []);

  const fetchLinkedInMetrics = useCallback(
    async (accessToken: string, action: string, postUrn?: string) => {
      const res = await fetch("/api/social/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, action, postUrn }),
      });
      return res.json();
    },
    []
  );

  const fetchInstagramMetrics = useCallback(
    async (accessToken: string, action: string, extra?: Record<string, unknown>) => {
      const res = await fetch("/api/social/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          action,
          ...(extra && typeof extra === "object" ? extra : {}),
        }),
      });
      return res.json();
    },
    []
  );

  return {
    loaded: loadedAll,
    persistence: useCloud ? ("supabase" as const) : ("local" as const),
    voiceProfile,
    contentList,
    goals,
    themes,
    activeGoal,
    pendingReview,
    published,
    addContent,
    updateContent,
    deleteContent,
    updateVoiceProfile,
    addVoiceRule,
    addAntiPattern,
    addVocabulary,
    removeVoiceItem,
    addGoldExample,
    resetVoice,
    setVoiceProfile,
    addGoal,
    toggleGoal,
    removeGoal,
    addThemes,
    curateTheme,
    generateContent,
    analyzeFeedback,
    researchThemes,
    generateImage,
    generateCarousel,
    analyzePerformance,
    connectLinkedIn,
    connectInstagram,
    fetchLinkedInMetrics,
    fetchInstagramMetrics,
    publishPost: async (
      post: string,
      platforms: string[],
      opts?: {
        mediaUrls?: string[];
        scheduledDate?: string;
        isVideo?: boolean;
      }
    ) => {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: opts?.scheduledDate ? "schedule" : "publish",
          post,
          platforms,
          ...opts,
        }),
      });
      return res.json();
    },
    checkPublishConfig: async () => {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      });
      return res.json();
    },
    getPublishHistory: async () => {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "history" }),
      });
      return res.json();
    },
    getPostAnalytics: async (postId: string, platforms: string[]) => {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analytics", postId, platforms }),
      });
      return res.json();
    },
    generateReport: async (period: "week" | "month") => {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      return res.json();
    },
    generateVideoScript: async (
      postBody: string,
      channel: string,
      format?: string
    ) => {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "script",
          postBody,
          channel,
          format,
        }),
      });
      return res.json();
    },
    generateVideoPrompt: async (postBody: string, format?: string) => {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prompt", postBody, format }),
      });
      return res.json();
    },
    generateVideo: async (opts: {
      customPrompt?: string;
      imageUrl?: string;
      provider?: string;
      duration?: number;
      format?: string;
    }) => {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", ...opts }),
      });
      return res.json();
    },
  };
}
