"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { VoiceProfile, Goal } from "@/lib/voice-engine";

export interface ContentItem {
  id: string;
  created_at: string;
  scheduled_at?: string;
  channel: string;
  pillar: string;
  status: "draft" | "pending_review" | "approved" | "published" | "rejected";
  body: string;
  original_body?: string;
  theme: string;
  rating?: number;
  feedback_note?: string;
  voice_version?: number;
}

export interface Theme {
  id: string;
  title: string;
  hook: string;
  pillar: string;
  source: string;
  source_url?: string;
  relevance: number;
  curated: boolean;
  used: boolean;
}

const DEFAULT_VOICE: VoiceProfile = {
  rules: [],
  anti_patterns: [],
  vocabulary: [],
  examples: [],
  version: 0,
};

// For MVP, we use Supabase if configured, otherwise localStorage fallback
function useLocalStorage<T>(key: string, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setData(JSON.parse(stored));
    } catch {}
    setLoaded(true);
  }, [key]);

  const save = useCallback(
    (newData: T | ((prev: T) => T)) => {
      setData((prev) => {
        const resolved =
          typeof newData === "function"
            ? (newData as (prev: T) => T)(prev)
            : newData;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {}
        return resolved;
      });
    },
    [key]
  );

  return [data, save, loaded] as const;
}

export function useContentEngine() {
  const [voiceProfile, setVoiceProfile, vpLoaded] =
    useLocalStorage<VoiceProfile>("ce-voice-profile", DEFAULT_VOICE);
  const [contentList, setContentList, clLoaded] = useLocalStorage<
    ContentItem[]
  >("ce-content", []);
  const [goals, setGoals, glLoaded] = useLocalStorage<Goal[]>("ce-goals", []);
  const [themes, setThemes, thLoaded] = useLocalStorage<Theme[]>(
    "ce-themes",
    []
  );

  const loaded = vpLoaded && clLoaded && glLoaded && thLoaded;
  const activeGoal = goals.find((g) => g.status === "active") || null;
  const pendingReview = contentList.filter(
    (c) => c.status === "pending_review"
  );
  const published = contentList.filter(
    (c) => c.status === "approved" || c.status === "published"
  );

  // --- CONTENT OPERATIONS ---

  const addContent = useCallback(
    (item: ContentItem) => {
      setContentList((prev) => [item, ...prev]);
    },
    [setContentList]
  );

  const updateContent = useCallback(
    (id: string, updates: Partial<ContentItem>) => {
      setContentList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    [setContentList]
  );

  const deleteContent = useCallback(
    (id: string) => {
      setContentList((prev) => prev.filter((c) => c.id !== id));
    },
    [setContentList]
  );

  // --- VOICE OPERATIONS ---

  const updateVoiceProfile = useCallback(
    (updates: Partial<VoiceProfile>) => {
      setVoiceProfile((prev) => ({ ...prev, ...updates }));
    },
    [setVoiceProfile]
  );

  const addVoiceRule = useCallback(
    (rule: string) => {
      setVoiceProfile((prev) => ({
        ...prev,
        rules: [...new Set([...prev.rules, rule])],
      }));
    },
    [setVoiceProfile]
  );

  const addAntiPattern = useCallback(
    (pattern: string) => {
      setVoiceProfile((prev) => ({
        ...prev,
        anti_patterns: [...new Set([...prev.anti_patterns, pattern])],
      }));
    },
    [setVoiceProfile]
  );

  const addVocabulary = useCallback(
    (word: string) => {
      setVoiceProfile((prev) => ({
        ...prev,
        vocabulary: [...new Set([...prev.vocabulary, word])],
      }));
    },
    [setVoiceProfile]
  );

  const removeVoiceItem = useCallback(
    (field: "rules" | "anti_patterns" | "vocabulary", index: number) => {
      setVoiceProfile((prev) => ({
        ...prev,
        [field]: prev[field].filter((_: any, i: number) => i !== index),
      }));
    },
    [setVoiceProfile]
  );

  const addGoldExample = useCallback(
    (text: string, rating: number, channel?: string) => {
      setVoiceProfile((prev) => ({
        ...prev,
        examples: [
          ...prev.examples,
          { text, rating, date: new Date().toISOString(), channel },
        ],
        version: prev.version + 1,
      }));
    },
    [setVoiceProfile]
  );

  const resetVoice = useCallback(() => {
    setVoiceProfile(DEFAULT_VOICE);
  }, [setVoiceProfile]);

  // --- GOAL OPERATIONS ---

  const addGoal = useCallback(
    (goal: Goal) => {
      setGoals((prev) => [
        goal,
        ...prev.map((g) =>
          g.status === "active" ? { ...g, status: "paused" as const } : g
        ),
      ]);
    },
    [setGoals]
  );

  const toggleGoal = useCallback(
    (id: string) => {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id === id)
            return {
              ...g,
              status: (g.status === "active" ? "paused" : "active") as any,
            };
          if (g.status === "active") return { ...g, status: "paused" as const };
          return g;
        })
      );
    },
    [setGoals]
  );

  const removeGoal = useCallback(
    (id: string) => {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    },
    [setGoals]
  );

  // --- THEME OPERATIONS ---

  const addThemes = useCallback(
    (newThemes: Theme[]) => {
      setThemes((prev) => [...newThemes, ...prev]);
    },
    [setThemes]
  );

  const curateTheme = useCallback(
    (id: string, curated: boolean) => {
      setThemes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, curated } : t))
      );
    },
    [setThemes]
  );

  // --- API CALLS ---

  const generateContent = useCallback(
    async (theme: string, channels: string[]) => {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          channels,
          voiceProfile,
          activeGoal,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.results as Record<string, string>;
    },
    [voiceProfile, activeGoal]
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

  // --- PHASE 2: IMAGE GENERATION ---

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

  // --- PHASE 2: CAROUSEL GENERATION ---

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

  // --- PHASE 2: ANALYTICS ---

  const analyzePerformance = useCallback(
    async (contentWithMetrics: any[]) => {
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

  // --- PHASE 2: SOCIAL MEDIA ---

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
    async (accessToken: string, action: string, extra?: any) => {
      const res = await fetch("/api/social/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, action, ...extra }),
      });
      return res.json();
    },
    []
  );

  return {
    // State
    loaded,
    voiceProfile,
    contentList,
    goals,
    themes,
    activeGoal,
    pendingReview,
    published,

    // Content
    addContent,
    updateContent,
    deleteContent,

    // Voice
    updateVoiceProfile,
    addVoiceRule,
    addAntiPattern,
    addVocabulary,
    removeVoiceItem,
    addGoldExample,
    resetVoice,
    setVoiceProfile,

    // Goals
    addGoal,
    toggleGoal,
    removeGoal,

    // Themes
    addThemes,
    curateTheme,

    // API (Phase 1)
    generateContent,
    analyzeFeedback,
    researchThemes,

    // API (Phase 2)
    generateImage,
    generateCarousel,
    analyzePerformance,
    connectLinkedIn,
    connectInstagram,
    fetchLinkedInMetrics,
    fetchInstagramMetrics,
  };
}
