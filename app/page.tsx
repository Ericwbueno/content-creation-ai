"use client";

import { useState } from "react";
import { useContentEngine, ContentItem, Theme } from "./components/useContentEngine";
import type { Goal } from "@/lib/voice-engine";
import { PROVIDERS, DEFAULT_ROUTES, DEFAULT_CONFIG, type LLMConfig, type TaskRoute } from "@/lib/llm-router";

// ===== CONSTANTS =====
const CHANNELS: Record<string, { label: string; emoji: string; color: string }> = {
  linkedin: { label: "LinkedIn", emoji: "💼", color: "#0A66C2" },
  twitter: { label: "X / Twitter", emoji: "𝕏", color: "#1DA1F2" },
  instagram: { label: "Instagram", emoji: "📸", color: "#E4405F" },
};

const PILLARS: Record<string, { label: string; color: string }> = {
  ai_business: { label: "AI + Negócios", color: "#6366f1" },
  alternative_assets: { label: "Ativos Alternativos", color: "#059669" },
  entrepreneurship: { label: "Empreendedorismo", color: "#d97706" },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "#6b7280" },
  pending_review: { label: "Pendente", color: "#f59e0b" },
  approved: { label: "Aprovado", color: "#10b981" },
  published: { label: "Publicado", color: "#6366f1" },
  rejected: { label: "Rejeitado", color: "#ef4444" },
};

const GOAL_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  growth: { label: "Crescimento", icon: "📈", color: "#10b981" },
  engagement: { label: "Engajamento", icon: "💬", color: "#6366f1" },
  authority: { label: "Autoridade", icon: "🏆", color: "#f59e0b" },
  leads: { label: "Leads", icon: "🎯", color: "#ef4444" },
};

// ===== MAIN APP =====
export default function Home() {
  const [tab, setTab] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const engine = useContentEngine();

  if (!engine.loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0e17]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚡</div>
          <p className="text-slate-400">Carregando Content Engine...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "◻" },
    { id: "calendar", label: "Cronograma", icon: "📅" },
    { id: "generate", label: "Gerar", icon: "+" },
    { id: "carousel", label: "Carrossel", icon: "▦" },
    { id: "review", label: "Revisar", icon: "✓", badge: engine.pendingReview.length },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "voice", label: "Voz", icon: "🎙" },
    { id: "goals", label: "Objetivos", icon: "◎" },
    { id: "llm", label: "AI Config", icon: "⚙" },
  ];

  const handleNav = (id: string) => {
    setTab(id);
    setMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#0a0e17]">
      {/* MOBILE HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f1320] border-b border-[#1e293b] px-4 py-3 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="text-sm font-bold text-white tracking-tight">Engine</span>
        </div>
        <div className="flex items-center gap-3">
          {engine.pendingReview.length > 0 && (
            <button onClick={() => handleNav("review")} className="relative">
              <span className="text-slate-400 text-sm">✓</span>
              <span className="absolute -top-1 -right-1.5 bg-amber-500 text-[#0a0e17] text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {engine.pendingReview.length}
              </span>
            </button>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-slate-300 p-1">
            {menuOpen ? (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            ) : (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/></svg>
            )}
          </button>
        </div>
      </header>

      {/* MOBILE MENU OVERLAY */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute top-[52px] right-0 w-56 bg-[#0f1320] border-l border-b border-[#1e293b] rounded-bl-xl shadow-2xl p-3" onClick={(e) => e.stopPropagation()}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => handleNav(t.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left relative ${
                  tab === t.id ? "bg-[#1e293b] text-white" : "text-slate-400"
                }`}
              >
                <span className="w-5 text-center">{t.icon}</span>
                {t.label}
                {t.badge ? (
                  <span className="absolute right-3 bg-amber-500 text-[#0a0e17] text-[10px] font-bold rounded-full px-1.5 py-0.5">{t.badge}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <nav className="hidden md:flex w-52 bg-[#0f1320] border-r border-[#1e293b] p-4 flex-col gap-1 sticky top-0 h-screen shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 mb-6">
          <span className="text-xl">⚡</span>
          <span className="text-base font-bold text-white tracking-tight">Engine</span>
        </div>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left relative ${
              tab === t.id
                ? "bg-[#1e293b] text-white"
                : "text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]/50"
            }`}
          >
            <span className="text-sm w-5 text-center">{t.icon}</span>
            {t.label}
            {t.badge ? (
              <span className="absolute right-3 bg-amber-500 text-[#0a0e17] text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* MAIN */}
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 max-w-3xl overflow-y-auto overflow-x-hidden">
        {tab === "dashboard" && <DashboardTab engine={engine} onNavigate={setTab} />}
        {tab === "calendar" && <CalendarTab engine={engine} onNavigate={setTab} />}
        {tab === "generate" && <GenerateTab engine={engine} onNavigate={setTab} />}
        {tab === "carousel" && <CarouselTab engine={engine} />}
        {tab === "review" && <ReviewTab engine={engine} />}
        {tab === "analytics" && <AnalyticsTab engine={engine} />}
        {tab === "voice" && <VoiceTab engine={engine} />}
        {tab === "goals" && <GoalsTab engine={engine} />}
        {tab === "llm" && <LLMConfigTab />}
      </main>
    </div>
  );
}

// ===== DASHBOARD TAB (Performance Overview) =====
function DashboardTab({ engine, onNavigate }: { engine: ReturnType<typeof useContentEngine>; onNavigate: (tab: string) => void }) {
  const metrics = (() => {
    try {
      const stored = localStorage.getItem("ce-manual-metrics");
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  })();

  const published = engine.contentList.filter((c) => c.status === "approved" || c.status === "published");
  const withMetrics = published.filter((c) => metrics[c.id]);
  const totalImpressions = withMetrics.reduce((sum, c) => sum + (metrics[c.id]?.impressions || 0), 0);
  const totalLikes = withMetrics.reduce((sum, c) => sum + (metrics[c.id]?.likes || 0), 0);
  const totalComments = withMetrics.reduce((sum, c) => sum + (metrics[c.id]?.comments || 0), 0);
  const avgEngagement = withMetrics.length > 0
    ? withMetrics.reduce((sum, c) => sum + (metrics[c.id]?.engagement_rate || 0), 0) / withMetrics.length
    : 0;

  // Posts by channel
  const byChannel: Record<string, number> = {};
  engine.contentList.forEach((c) => { byChannel[c.channel] = (byChannel[c.channel] || 0) + 1; });

  // Posts by pillar
  const byPillar: Record<string, number> = {};
  engine.contentList.forEach((c) => { if (c.pillar) byPillar[c.pillar] = (byPillar[c.pillar] || 0) + 1; });

  // Posts this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thisWeek = engine.contentList.filter((c) => c.created_at > weekAgo);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <button onClick={() => onNavigate("generate")} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium">
            + Gerar
          </button>
          <button onClick={() => onNavigate("calendar")} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-medium">
            📅 Cronograma
          </button>
        </div>
      </div>

      {/* PERFORMANCE STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white tracking-tight">{totalImpressions > 1000 ? `${(totalImpressions / 1000).toFixed(1)}k` : totalImpressions}</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">Impressões</div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">{avgEngagement.toFixed(1)}%</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">Engajamento</div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-rose-400 tracking-tight">{totalLikes}</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">Likes</div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 tracking-tight">{totalComments}</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">Comentários</div>
        </div>
      </div>

      {/* PIPELINE SUMMARY */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 md:p-5 mb-4">
        <h3 className="text-sm font-semibold text-white mb-3">Pipeline de conteúdo</h3>
        <div className="flex gap-1 mb-3 rounded-lg overflow-hidden h-3">
          {[
            { status: "approved", color: "#10b981" },
            { status: "pending_review", color: "#f59e0b" },
            { status: "draft", color: "#6366f1" },
            { status: "rejected", color: "#ef4444" },
          ].map(({ status, color }) => {
            const count = engine.contentList.filter((c) => c.status === status).length;
            const pct = engine.contentList.length > 0 ? (count / engine.contentList.length) * 100 : 0;
            return pct > 0 ? <div key={status} style={{ width: `${pct}%`, background: color }} className="transition-all" /> : null;
          })}
          {engine.contentList.length === 0 && <div className="w-full bg-[#1e293b]" />}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <span className="text-emerald-400">● {engine.contentList.filter((c) => c.status === "approved").length} aprovados</span>
          <span className="text-amber-400">● {engine.pendingReview.length} pendentes</span>
          <span className="text-indigo-400">● {engine.contentList.filter((c) => c.status === "draft").length} rascunhos</span>
          <span className="text-red-400">● {engine.contentList.filter((c) => c.status === "rejected").length} rejeitados</span>
        </div>
      </div>

      {/* CHANNEL + PILLAR DISTRIBUTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Por canal</h3>
          {Object.entries(CHANNELS).map(([key, { label: l, emoji: e, color: c }]) => {
            const count = byChannel[key] || 0;
            const pct = engine.contentList.length > 0 ? (count / engine.contentList.length) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-2 mb-2">
                <span className="text-sm w-6">{e}</span>
                <span className="text-xs text-slate-300 w-16">{l}</span>
                <div className="flex-1 h-2 bg-[#1e293b] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
                </div>
                <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Por pilar</h3>
          {Object.entries(PILLARS).map(([key, { label, color }]) => {
            const count = byPillar[key] || 0;
            const pct = engine.contentList.length > 0 ? (count / engine.contentList.length) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-2 mb-2">
                <span className="text-xs w-20 truncate" style={{ color }}>{label}</span>
                <div className="flex-1 h-2 bg-[#1e293b] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTIVE GOAL + VOICE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {engine.activeGoal && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-300">
            <strong>◎ Objetivo:</strong> {GOAL_TYPES[engine.activeGoal.type]?.label}
            {engine.activeGoal.strategy_notes && <p className="text-slate-400 text-xs mt-1">{engine.activeGoal.strategy_notes}</p>}
          </div>
        )}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Voice Profile</div>
            <div className="text-lg font-bold text-white">v{engine.voiceProfile.version}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">{engine.voiceProfile.rules.length} regras</div>
            <div className="text-xs text-slate-500">{engine.voiceProfile.examples.filter((e: any) => e.rating >= 4).length} exemplos gold</div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Esta semana ({thisWeek.length} posts)</h2>
      {thisWeek.length === 0 ? (
        <div className="text-center py-8 bg-[#111827] border border-dashed border-[#1e293b] rounded-xl text-slate-500 text-sm">
          Nenhum post esta semana. <button onClick={() => onNavigate("calendar")} className="text-indigo-400 underline">Gerar cronograma</button>
        </div>
      ) : (
        thisWeek.slice(0, 5).map((item) => <ContentPreviewCard key={item.id} item={item} metrics={metrics[item.id]} />)
      )}
    </div>
  );
}

// ===== CALENDAR / CRONOGRAMA TAB =====
function CalendarTab({ engine, onNavigate }: { engine: ReturnType<typeof useContentEngine>; onNavigate: (tab: string) => void }) {
  const STAT: Record<string, { l: string; c: string; bg: string }> = {
    idea: { l: "Ideia", c: "#64748b", bg: "#64748b15" },
    draft: { l: "Rascunho", c: "#818cf8", bg: "#818cf815" },
    pending_review: { l: "Pendente", c: "#f59e0b", bg: "#f59e0b15" },
    approved: { l: "Aprovado", c: "#10b981", bg: "#10b98115" },
    scheduled: { l: "Agendado", c: "#0ea5e9", bg: "#0ea5e915" },
    published: { l: "Publicado", c: "#8b5cf6", bg: "#8b5cf615" },
    rejected: { l: "Rejeitado", c: "#ef4444", bg: "#ef444415" },
  };

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [filter, setFilter] = useState<string>("all"); // all, approved, pending_review, draft, published, rejected
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [generating, setGenerating] = useState(false);
  const [genWeeks, setGenWeeks] = useState(4);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const metrics = (() => {
    try {
      const stored = localStorage.getItem("ce-manual-metrics");
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  })();

  // Calendar math
  const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const firstDay = new Date(viewMonth.year, viewMonth.month, 1);
  const lastDay = new Date(viewMonth.year, viewMonth.month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Map posts to dates
  const postsByDate: Record<string, typeof engine.contentList> = {};
  engine.contentList.forEach((item) => {
    const dateStr = (item.scheduled_at || item.created_at || "").slice(0, 10);
    if (!dateStr) return;
    if (!postsByDate[dateStr]) postsByDate[dateStr] = [];
    postsByDate[dateStr].push(item);
  });

  // Filter posts
  const filteredContent = engine.contentList.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (channelFilter !== "all" && c.channel !== channelFilter) return false;
    return true;
  });

  // Stats for this month
  const monthPosts = engine.contentList.filter((c) => {
    const d = (c.scheduled_at || c.created_at || "").slice(0, 7);
    return d === `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}`;
  });
  const monthApproved = monthPosts.filter((c) => c.status === "approved" || c.status === "published").length;
  const monthPending = monthPosts.filter((c) => c.status === "pending_review").length;
  const monthDraft = monthPosts.filter((c) => c.status === "draft").length;

  // Metrics for month
  const monthWithMetrics = monthPosts.filter((c) => metrics[c.id]);
  const monthImpressions = monthWithMetrics.reduce((s, c) => s + (metrics[c.id]?.impressions || 0), 0);
  const monthEngagement = monthWithMetrics.length > 0
    ? monthWithMetrics.reduce((s, c) => s + (metrics[c.id]?.engagement_rate || 0), 0) / monthWithMetrics.length
    : 0;

  const prevMonth = () => {
    setViewMonth((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setViewMonth((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
    setSelectedDay(null);
  };

  // AI schedule generation
  const handleGenerateSchedule = async () => {
    setGenerating(true);
    try {
      const startDate = new Date(viewMonth.year, viewMonth.month, 1);
      const channels = ["linkedin", "twitter", "instagram"];
      const pillars = Object.keys(PILLARS);

      // Generate themes first
      const themesRes = await engine.researchThemes(pillars);
      const themes = themesRes.slice(0, genWeeks * 3); // ~3 posts per week

      // Generate content for each theme across channels
      for (let i = 0; i < themes.length; i++) {
        const theme = themes[i];
        const dayOffset = Math.floor(i / 3) * 2 + (i % 3); // spread across days
        const schedDate = new Date(startDate);
        schedDate.setDate(schedDate.getDate() + dayOffset + Math.floor(i * 2.3));

        // Pick 1-2 channels per theme
        const selectedChannels = [channels[i % channels.length]];
        if (i % 3 === 0) selectedChannels.push(channels[(i + 1) % channels.length]);

        try {
          const results = await engine.generateContent(theme.title + " — " + (theme.hook || ""), selectedChannels);

          for (const [ch, body] of Object.entries(results)) {
            engine.addContent({
              id: `${Date.now()}-${ch}-${i}`,
              created_at: new Date().toISOString(),
              scheduled_at: schedDate.toISOString(),
              channel: ch,
              pillar: theme.pillar || pillars[i % pillars.length],
              status: "pending_review",
              body,
              original_body: body,
              theme: theme.title,
              voice_version: engine.voiceProfile.version,
            });
          }
        } catch {}
      }
    } catch (err: any) {
      alert("Erro ao gerar cronograma: " + err.message);
    }
    setGenerating(false);
  };

  // Selected day posts
  const selectedDayPosts = selectedDay ? (postsByDate[selectedDay] || []).filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (channelFilter !== "all" && c.channel !== channelFilter) return false;
    return true;
  }) : [];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">Cronograma</h1>
        <button
          onClick={handleGenerateSchedule}
          disabled={generating}
          className="px-3 py-1.5 bg-white text-[#0a0e17] rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-slate-200 transition"
        >
          {generating ? "⏳ Gerando..." : "⚡ Gerar cronograma com AI"}
        </button>
      </div>

      {generating && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 mb-4 text-center">
          <div className="text-indigo-400 text-lg mb-2 animate-pulse">⚡</div>
          <p className="text-sm text-indigo-300">AI pesquisando temas e gerando conteúdo pro mês...</p>
          <p className="text-xs text-slate-500 mt-1">Isso pode levar 1-2 minutos</p>
        </div>
      )}

      {/* MONTH STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">{monthPosts.length}</div>
          <div className="text-[10px] text-slate-500 uppercase">Total</div>
        </div>
        <div className="bg-[#111827] border border-emerald-500/10 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-emerald-400">{monthApproved}</div>
          <div className="text-[10px] text-slate-500 uppercase">Aprovados</div>
        </div>
        <div className="bg-[#111827] border border-amber-500/10 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-amber-400">{monthPending}</div>
          <div className="text-[10px] text-slate-500 uppercase">Pendentes</div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-400">{monthImpressions > 1000 ? `${(monthImpressions / 1000).toFixed(1)}k` : monthImpressions}</div>
          <div className="text-[10px] text-slate-500 uppercase">Impressões</div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-purple-400">{monthEngagement.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-500 uppercase">Eng. médio</div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 bg-[#111827] rounded-lg p-1 border border-[#1e293b]">
          {[
            { id: "all", l: "Todos" },
            { id: "approved", l: "Aprovados" },
            { id: "pending_review", l: "Pendentes" },
            { id: "draft", l: "Rascunhos" },
            { id: "published", l: "Publicados" },
            { id: "rejected", l: "Rejeitados" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${
                filter === f.id ? "bg-[#1e293b] text-white" : "text-slate-500"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-[#111827] rounded-lg p-1 border border-[#1e293b]">
          <button onClick={() => setChannelFilter("all")} className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${channelFilter === "all" ? "bg-[#1e293b] text-white" : "text-slate-500"}`}>
            Todos
          </button>
          {Object.entries(CHANNELS).map(([key, { emoji }]) => (
            <button
              key={key}
              onClick={() => setChannelFilter(key)}
              className={`px-2 py-1 rounded-md text-[10px] transition ${channelFilter === key ? "bg-[#1e293b]" : ""}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden mb-4">
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b]">
          <button onClick={prevMonth} className="text-slate-400 hover:text-white text-sm px-2">←</button>
          <h3 className="text-sm font-semibold text-white">{MONTH_NAMES[viewMonth.month]} {viewMonth.year}</h3>
          <button onClick={nextMonth} className="text-slate-400 hover:text-white text-sm px-2">→</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#1e293b]">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] text-slate-500 py-2 font-medium">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 md:h-20 border-b border-r border-[#1e293b]/50" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDay;
            const dayPosts = (postsByDate[dateStr] || []).filter((c) => {
              if (filter !== "all" && c.status !== filter) return false;
              if (channelFilter !== "all" && c.channel !== channelFilter) return false;
              return true;
            });
            const hasApproved = dayPosts.some((p) => p.status === "approved" || p.status === "published");
            const hasPending = dayPosts.some((p) => p.status === "pending_review");

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                className={`h-16 md:h-20 border-b border-r border-[#1e293b]/50 p-1 text-left relative transition hover:bg-[#1e293b]/30 ${
                  isSelected ? "bg-indigo-500/10 ring-1 ring-indigo-500/30" : ""
                } ${isToday ? "bg-[#1e293b]/40" : ""}`}
              >
                <span className={`text-[11px] font-medium ${isToday ? "text-indigo-400" : "text-slate-400"}`}>
                  {day}
                </span>
                {dayPosts.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {dayPosts.slice(0, 3).map((p, pi) => (
                      <span
                        key={pi}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: STAT[p.status as keyof typeof STAT]?.c || "#64748b" }}
                        title={`${CHANNELS[p.channel]?.label} - ${STAT[p.status as keyof typeof STAT]?.l}`}
                      />
                    ))}
                    {dayPosts.length > 3 && (
                      <span className="text-[8px] text-slate-500">+{dayPosts.length - 3}</span>
                    )}
                  </div>
                )}
                {/* Mini channel icons */}
                {dayPosts.length > 0 && (
                  <div className="absolute bottom-1 left-1 flex gap-0.5">
                    {[...new Set(dayPosts.map((p) => p.channel))].map((ch) => (
                      <span key={ch} className="text-[8px]">{CHANNELS[ch]?.emoji}</span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED DAY DETAIL */}
      {selectedDay && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            <span className="ml-2 text-slate-500">({selectedDayPosts.length} posts)</span>
          </h3>
          {selectedDayPosts.length === 0 ? (
            <div className="text-center py-6 bg-[#111827] border border-dashed border-[#1e293b] rounded-xl text-slate-500 text-sm">
              Nenhum post neste dia.
              <button onClick={() => onNavigate("generate")} className="text-indigo-400 underline ml-1">Criar um</button>
            </div>
          ) : (
            selectedDayPosts.map((item) => (
              <div key={item.id} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{CHANNELS[item.channel]?.emoji}</span>
                  <strong className="text-white text-xs">{CHANNELS[item.channel]?.label}</strong>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                    background: STAT[item.status as keyof typeof STAT]?.bg || "#64748b15",
                    color: STAT[item.status as keyof typeof STAT]?.c || "#64748b",
                  }}>
                    {STAT[item.status as keyof typeof STAT]?.l || item.status}
                  </span>
                  {item.pillar && <span className="text-[10px]" style={{ color: PILLARS[item.pillar]?.color }}>{PILLARS[item.pillar]?.label}</span>}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">{item.body?.slice(0, 180)}{(item.body?.length || 0) > 180 ? "..." : ""}</p>
                {/* Metrics if available */}
                {metrics[item.id] && (
                  <div className="flex gap-3 text-[10px] text-slate-500 border-t border-[#1e293b] pt-2 mt-2">
                    <span>👁 {metrics[item.id].impressions}</span>
                    <span>❤️ {metrics[item.id].likes}</span>
                    <span>💬 {metrics[item.id].comments}</span>
                    <span className="text-emerald-500">{metrics[item.id].engagement_rate?.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* LIST VIEW — posts this month */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Lista — {MONTH_NAMES[viewMonth.month]} ({filteredContent.filter((c) => {
          const d = (c.scheduled_at || c.created_at || "").slice(0, 7);
          return d === `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}`;
        }).length} posts)
      </h2>
      {filteredContent.filter((c) => {
        const d = (c.scheduled_at || c.created_at || "").slice(0, 7);
        return d === `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}`;
      }).length === 0 ? (
        <div className="text-center py-8 bg-[#111827] border border-dashed border-[#1e293b] rounded-xl text-slate-500 text-sm">
          Nenhum post pra este mês. Clique em "Gerar cronograma com AI" pra criar.
        </div>
      ) : (
        filteredContent.filter((c) => {
          const d = (c.scheduled_at || c.created_at || "").slice(0, 7);
          return d === `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}`;
        }).map((item) => <ContentPreviewCard key={item.id} item={item} metrics={metrics[item.id]} />)
      )}
    </div>
  );
}

// ===== GENERATE TAB =====
function GenerateTab({ engine, onNavigate }: { engine: ReturnType<typeof useContentEngine>; onNavigate: (tab: string) => void }) {
  const [theme, setTheme] = useState("");
  const [pillar, setPillar] = useState("ai_business");
  const [channels, setChannels] = useState(["linkedin"]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [researching, setResearching] = useState(false);
  const [researchResults, setResearchResults] = useState<any[]>([]);

  const toggleChannel = (ch: string) => {
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));
  };

  const handleGenerate = async () => {
    if (!theme.trim() || channels.length === 0) return;
    setGenerating(true);
    setResults(null);
    try {
      const res = await engine.generateContent(theme, channels);
      setResults(res);
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
    setGenerating(false);
  };

  const handleResearch = async () => {
    setResearching(true);
    try {
      const themes = await engine.researchThemes([pillar]);
      setResearchResults(themes);
    } catch {
      alert("Erro na pesquisa");
    }
    setResearching(false);
  };

  const sendToReview = async (channel: string, body: string) => {
    engine.addContent({
      id: Date.now().toString() + "-" + channel,
      created_at: new Date().toISOString(),
      channel,
      pillar,
      status: "pending_review",
      body,
      original_body: body,
      theme,
      voice_version: engine.voiceProfile.version,
    });
  };

  const sendAllToReview = async () => {
    if (!results) return;
    for (const [ch, body] of Object.entries(results)) {
      await sendToReview(ch, body);
    }
    setResults(null);
    setTheme("");
    onNavigate("review");
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-white tracking-tight mb-6">Gerar Conteúdo</h1>

      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 mb-4">
        {/* Research button */}
        <div className="flex justify-between items-center mb-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tema / Ideia</label>
          <button
            onClick={handleResearch}
            disabled={researching}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition disabled:opacity-50"
          >
            {researching ? "Pesquisando..." : "🔍 Pesquisar temas"}
          </button>
        </div>

        <textarea
          className="w-full p-3 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm resize-y focus:border-indigo-500 placeholder-slate-600"
          rows={3}
          placeholder="Ex: Como estamos usando Claude na operação da Trigo pra reduzir tempo de análise de crédito..."
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        />

        {/* Research results */}
        {researchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500">Temas encontrados (clique pra usar):</p>
            {researchResults.map((t: any, i: number) => (
              <button
                key={i}
                onClick={() => { setTheme(t.title + " — " + t.hook); setPillar(t.pillar || pillar); setResearchResults([]); }}
                className="w-full text-left p-3 bg-[#0a0e17] border border-[#1e293b] rounded-lg hover:border-indigo-500/50 transition text-sm"
              >
                <div className="text-slate-200 font-medium">{t.title}</div>
                <div className="text-slate-500 text-xs mt-1">{t.hook}</div>
                {t.source && <div className="text-slate-600 text-[10px] mt-1">Fonte: {t.source}</div>}
              </button>
            ))}
          </div>
        )}

        {/* Pillar */}
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4 mb-2">Pilar</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(PILLARS).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={() => setPillar(key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition"
              style={{
                background: pillar === key ? color + "22" : "transparent",
                color: pillar === key ? color : "#94a3b8",
                borderColor: pillar === key ? color + "55" : "#334155",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Channels */}
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4 mb-2">Canais</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(CHANNELS).map(([key, { label, emoji }]) => {
            const active = channels.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleChannel(key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                style={{
                  background: active ? "#e2e8f011" : "transparent",
                  color: active ? "#e2e8f0" : "#64748b",
                  borderColor: active ? "#475569" : "#334155",
                }}
              >
                {emoji} {label}
              </button>
            );
          })}
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={generating || !theme.trim() || channels.length === 0}
          className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#0a0e17] rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-slate-200 transition"
        >
          {generating ? "Gerando com Claude..." : "⚡ Gerar conteúdo"}
        </button>
      </div>

      {/* Loading */}
      {generating && (
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-8 text-center">
          <div className="text-indigo-400 text-lg mb-2 animate-pulse">● ● ●</div>
          <p className="text-slate-400 text-sm">Claude está escrevendo como Eric...</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div>
          <div className="flex justify-between items-center my-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rascunhos gerados</h2>
            <button onClick={sendAllToReview} className="px-4 py-2 bg-white text-[#0a0e17] rounded-lg text-xs font-semibold hover:bg-slate-200 transition">
              Enviar todos pra revisão →
            </button>
          </div>
          {Object.entries(results).map(([ch, body]) => (
            <div key={ch} className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <span>{CHANNELS[ch]?.emoji}</span>
                <strong className="text-white text-sm">{CHANNELS[ch]?.label}</strong>
              </div>
              <div className="whitespace-pre-wrap text-slate-300 text-sm leading-relaxed p-4 bg-[#0a0e17] rounded-lg border border-[#1e293b]">
                {body}
              </div>
              <button
                onClick={() => sendToReview(ch, body)}
                className="mt-3 px-3 py-1.5 bg-[#1e293b] text-slate-400 border border-[#334155] rounded-md text-xs hover:text-white transition"
              >
                Enviar pra revisão
              </button>
              <ImageGenerator engine={engine} postBody={body} channel={ch} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== REVIEW TAB =====
function ReviewTab({ engine }: { engine: ReturnType<typeof useContentEngine> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [rating, setRating] = useState(0);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [lastInsight, setLastInsight] = useState<string | null>(null);

  const pending = engine.pendingReview;
  const reviewed = engine.contentList.filter((c) => c.status === "approved" || c.status === "rejected");

  const startEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setEditText(item.body);
    setRating(0);
    setFeedbackNote("");
  };

  const handleApprove = async (item: ContentItem, wasEdited: boolean) => {
    const finalText = wasEdited ? editText : item.body;
    engine.updateContent(item.id, {
      status: "approved",
      body: finalText,
      rating,
      feedback_note: feedbackNote,
    });

    // Analyze diff if edited
    if (wasEdited && editText !== item.body) {
      setAnalyzing(true);
      try {
        const analysis = await engine.analyzeFeedback(item.original_body || item.body, editText);
        if (analysis) {
          const vp = engine.voiceProfile;
          engine.setVoiceProfile({
            ...vp,
            rules: [...new Set([...vp.rules, ...(analysis.new_rules || [])])],
            anti_patterns: [...new Set([...vp.anti_patterns, ...(analysis.anti_patterns || [])])],
            vocabulary: [...new Set([...vp.vocabulary, ...(analysis.vocabulary || [])])],
            examples: [...vp.examples, { text: editText, rating, date: new Date().toISOString() }],
            version: vp.version + 1,
          });
          if (analysis.insight) setLastInsight(analysis.insight);
        }
      } catch {}
      setAnalyzing(false);
    } else if (rating >= 4) {
      engine.addGoldExample(item.body, rating, item.channel);
    }

    setEditingId(null);
    setRating(0);
    setFeedbackNote("");
  };

  const handleReject = (item: ContentItem) => {
    engine.updateContent(item.id, { status: "rejected", feedback_note: feedbackNote });
    if (feedbackNote) {
      engine.addAntiPattern(feedbackNote);
    }
    setEditingId(null);
    setFeedbackNote("");
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-white tracking-tight mb-6">Revisão</h1>

      {lastInsight && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4 text-sm text-emerald-300 flex items-start gap-2 relative">
          <span>🧠</span>
          <div><strong>Aprendizado:</strong> {lastInsight}</div>
          <button onClick={() => setLastInsight(null)} className="absolute top-3 right-3 text-emerald-400 hover:text-white">×</button>
        </div>
      )}

      {analyzing && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 mb-4 text-center text-sm text-indigo-300">
          🧠 Analisando suas edições pra aprender seu tom de voz...
        </div>
      )}

      {pending.length === 0 ? (
        <div className="text-center py-10 bg-[#111827] border border-dashed border-[#1e293b] rounded-xl text-slate-500 text-sm">
          Nenhum post pendente de revisão.
        </div>
      ) : (
        pending.map((item) => (
          <div key={item.id} className="bg-[#111827] border border-amber-500/20 rounded-xl p-5 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span>{CHANNELS[item.channel]?.emoji}</span>
              <strong className="text-white text-sm">{CHANNELS[item.channel]?.label}</strong>
              {item.pillar && (
                <span className="text-[11px]" style={{ color: PILLARS[item.pillar]?.color }}>
                  {PILLARS[item.pillar]?.label}
                </span>
              )}
              <span className="text-slate-600 text-[11px] ml-auto">{item.theme?.slice(0, 40)}</span>
            </div>

            {editingId === item.id ? (
              <>
                <textarea
                  className="w-full p-3 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm resize-y min-h-[200px] focus:border-indigo-500"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />

                <div className="flex items-center gap-1 my-3">
                  <span className="text-slate-400 text-xs mr-2">Nota:</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRating(n)} className="text-amber-400 hover:scale-110 transition">
                      {n <= rating ? "★" : "☆"}
                    </button>
                  ))}
                </div>

                <input
                  className="w-full p-2.5 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm focus:border-indigo-500 placeholder-slate-600"
                  placeholder="Feedback livre (ex: 'muito formal', 'adorei a abertura')..."
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                />

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApprove(item, editText !== item.body)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition"
                  >
                    ✓ Aprovar{editText !== item.body ? " (editado)" : ""}
                  </button>
                  <button
                    onClick={() => handleReject(item)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20 transition"
                  >
                    ✕ Rejeitar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 text-slate-500 border border-[#334155] rounded-lg text-sm hover:text-white transition"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="whitespace-pre-wrap text-slate-300 text-sm leading-relaxed p-4 bg-[#0a0e17] rounded-lg border border-[#1e293b]">
                  {item.body}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => startEdit(item)}
                    className="px-3 py-1.5 bg-[#1e293b] text-slate-400 border border-[#334155] rounded-md text-xs hover:text-white transition"
                  >
                    ✎ Editar e revisar
                  </button>
                  <button
                    onClick={() => { setRating(4); handleApprove(item, false); }}
                    className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs hover:bg-emerald-500/20 transition"
                  >
                    ✓ Aprovar direto
                  </button>
                  <button
                    onClick={() => engine.deleteContent(item.id)}
                    className="px-3 py-1.5 text-slate-600 hover:text-red-400 transition text-xs ml-auto"
                  >
                    🗑
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}

      {reviewed.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Já revisados ({reviewed.length})
          </h2>
          {reviewed.slice(0, 5).map((item) => (
            <ContentPreviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ===== VOICE TAB =====
function VoiceTab({ engine }: { engine: ReturnType<typeof useContentEngine> }) {
  const [newRule, setNewRule] = useState("");
  const [newAnti, setNewAnti] = useState("");
  const [newVocab, setNewVocab] = useState("");

  const vp = engine.voiceProfile;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-bold text-white tracking-tight">Voice Profile</h1>
        <span className="bg-indigo-500/10 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full">v{vp.version}</span>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Aprende automaticamente com cada revisão. Adicione regras manualmente também.
      </p>

      {/* Rules */}
      <Section title="✅ Regras de tom" subtitle="O que o sistema aprendeu sobre como você escreve">
        {vp.rules.map((r, i) => (
          <RuleItem key={i} text={r} onRemove={() => engine.removeVoiceItem("rules", i)} />
        ))}
        <AddRow value={newRule} onChange={setNewRule} placeholder="Adicionar regra..."
          onAdd={() => { if (newRule.trim()) { engine.addVoiceRule(newRule.trim()); setNewRule(""); } }} />
      </Section>

      {/* Anti-patterns */}
      <Section title="🚫 Anti-patterns" subtitle="O que nunca usar">
        {vp.anti_patterns.map((a, i) => (
          <RuleItem key={i} text={a} onRemove={() => engine.removeVoiceItem("anti_patterns", i)} danger />
        ))}
        <AddRow value={newAnti} onChange={setNewAnti} placeholder="Adicionar anti-pattern..."
          onAdd={() => { if (newAnti.trim()) { engine.addAntiPattern(newAnti.trim()); setNewAnti(""); } }} />
      </Section>

      {/* Vocabulary */}
      <Section title="💬 Vocabulário preferido">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {vp.vocabulary.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1e293b] rounded-full text-xs text-slate-400">
              {v}
              <button onClick={() => engine.removeVoiceItem("vocabulary", i)} className="text-slate-600 hover:text-red-400 text-[10px]">×</button>
            </span>
          ))}
        </div>
        <AddRow value={newVocab} onChange={setNewVocab} placeholder="Adicionar palavra/expressão..."
          onAdd={() => { if (newVocab.trim()) { engine.addVocabulary(newVocab.trim()); setNewVocab(""); } }} />
      </Section>

      {/* Gold examples */}
      <Section title="⭐ Exemplos gold" subtitle="Posts aprovados com nota alta">
        {vp.examples.filter((e) => e.rating >= 4).length === 0 ? (
          <p className="text-slate-600 text-sm">Aprove posts com nota 4+ pra popularem aqui.</p>
        ) : (
          vp.examples.filter((e) => e.rating >= 4).slice(-5).map((e, i) => (
            <div key={i} className="p-3 bg-[#0a0e17] border border-amber-400/10 rounded-lg mb-2">
              <div className="text-amber-400 text-[11px] mb-1">{"★".repeat(e.rating)} · {new Date(e.date).toLocaleDateString("pt-BR")}</div>
              <p className="text-slate-300 text-xs leading-relaxed">{e.text?.slice(0, 250)}...</p>
            </div>
          ))
        )}
      </Section>

      <button
        onClick={() => { if (confirm("Resetar todo o perfil de voz?")) engine.resetVoice(); }}
        className="mt-4 flex items-center gap-2 px-4 py-2 text-red-400 border border-red-500/20 rounded-lg text-xs hover:bg-red-500/10 transition"
      >
        🗑 Resetar perfil de voz
      </button>
    </div>
  );
}

// ===== GOALS TAB =====
function GoalsTab({ engine }: { engine: ReturnType<typeof useContentEngine> }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "growth",
    target_metric: "",
    target_value: "",
    strategy_notes: "",
    period_start: new Date().toISOString().split("T")[0],
    period_end: "",
  });

  const handleAdd = () => {
    const goal: Goal = {
      id: Date.now().toString(),
      type: form.type as any,
      target_metric: form.target_metric,
      target_value: parseFloat(form.target_value) || 0,
      current_value: 0,
      strategy_notes: form.strategy_notes,
      status: "active",
      period_start: form.period_start,
      period_end: form.period_end,
    };
    engine.addGoal(goal);
    setShowForm(false);
    setForm({ type: "growth", target_metric: "", target_value: "", strategy_notes: "", period_start: new Date().toISOString().split("T")[0], period_end: "" });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Objetivos</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-white text-[#0a0e17] rounded-lg text-xs font-semibold hover:bg-slate-200 transition">
          + Novo objetivo
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 mb-4">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tipo</label>
          <div className="flex gap-2 flex-wrap mb-4">
            {Object.entries(GOAL_TYPES).map(([key, { label, icon, color }]) => (
              <button
                key={key}
                onClick={() => setForm({ ...form, type: key })}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                style={{
                  background: form.type === key ? color + "22" : "transparent",
                  color: form.type === key ? color : "#94a3b8",
                  borderColor: form.type === key ? color + "55" : "#334155",
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Métrica alvo</label>
          <input className="w-full p-2.5 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm mb-3 focus:border-indigo-500 placeholder-slate-600"
            placeholder="Ex: seguidores LinkedIn, impressões/semana..." value={form.target_metric} onChange={(e) => setForm({ ...form, target_metric: e.target.value })} />

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Valor alvo</label>
          <input className="w-full p-2.5 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm mb-3 focus:border-indigo-500 placeholder-slate-600"
            type="number" placeholder="Ex: 5000" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} />

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Estratégia</label>
          <textarea className="w-full p-2.5 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm mb-3 resize-y focus:border-indigo-500 placeholder-slate-600"
            rows={3} placeholder="O que o Claude deve priorizar nos conteúdos?" value={form.strategy_notes} onChange={(e) => setForm({ ...form, strategy_notes: e.target.value })} />

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Início</label>
              <input className="w-full p-2 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm focus:border-indigo-500"
                type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fim</label>
              <input className="w-full p-2 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm focus:border-indigo-500"
                type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-white text-[#0a0e17] rounded-lg text-sm font-semibold hover:bg-slate-200 transition">
              Criar objetivo
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 border border-[#334155] rounded-lg text-sm hover:text-white transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {engine.goals.length === 0 ? (
        <div className="text-center py-10 bg-[#111827] border border-dashed border-[#1e293b] rounded-xl text-slate-500 text-sm">
          Nenhum objetivo definido. Crie um pra direcionar a estratégia.
        </div>
      ) : (
        engine.goals.map((g) => {
          const gt = GOAL_TYPES[g.type] || GOAL_TYPES.growth;
          return (
            <div key={g.id} className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 mb-3" style={{ borderLeftWidth: 3, borderLeftColor: gt.color, opacity: g.status === "paused" ? 0.6 : 1 }}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{gt.icon}</span>
                  <strong className="text-white text-sm">{gt.label}</strong>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase"
                    style={{ background: g.status === "active" ? "#10b98122" : "#64748b22", color: g.status === "active" ? "#10b981" : "#64748b" }}>
                    {g.status}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => engine.toggleGoal(g.id)} className="px-2 py-1 text-slate-500 border border-[#334155] rounded text-xs hover:text-white transition">
                    {g.status === "active" ? "⏸" : "▶"}
                  </button>
                  <button onClick={() => engine.removeGoal(g.id)} className="px-2 py-1 text-slate-600 hover:text-red-400 transition text-xs">🗑</button>
                </div>
              </div>
              {g.target_metric && <p className="text-slate-400 text-xs mt-2">Meta: {g.target_value} {g.target_metric}</p>}
              {g.strategy_notes && <p className="text-slate-300 text-xs mt-1">{g.strategy_notes}</p>}
              {g.period_start && (
                <p className="text-slate-600 text-[11px] mt-2">
                  {new Date(g.period_start).toLocaleDateString("pt-BR")} → {g.period_end ? new Date(g.period_end).toLocaleDateString("pt-BR") : "em aberto"}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ===== IMAGE GENERATOR (inline component) =====
function ImageGenerator({ engine, postBody, channel }: { engine: ReturnType<typeof useContentEngine>; postBody: string; channel: string }) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ prompt: string; url: string | null; message?: string } | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await engine.generateImage(postBody, channel, showCustom && customPrompt ? customPrompt : undefined);
      setResult(res);
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
    setGenerating(false);
  };

  return (
    <div className="mt-3 border-t border-[#1e293b] pt-3">
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md text-xs hover:bg-purple-500/20 transition disabled:opacity-40"
        >
          {generating ? "Gerando imagem..." : "🖼 Gerar imagem"}
        </button>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="text-xs text-slate-500 hover:text-slate-300 transition"
        >
          {showCustom ? "Ocultar prompt" : "Prompt custom"}
        </button>
      </div>

      {showCustom && (
        <input
          className="w-full mt-2 p-2 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-xs focus:border-indigo-500 placeholder-slate-600"
          placeholder="Descreva a imagem que quer (em inglês funciona melhor)..."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
        />
      )}

      {result && (
        <div className="mt-3">
          <p className="text-xs text-slate-500 mb-2">Prompt: {result.prompt?.slice(0, 150)}...</p>
          {result.url ? (
            <img src={result.url} alt="Generated" className="rounded-lg border border-[#1e293b] max-w-full" />
          ) : (
            <p className="text-xs text-amber-400">{result.message || "Imagem não gerada (configure REPLICATE_API_TOKEN)"}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ===== CAROUSEL TAB =====
function CarouselTab({ engine }: { engine: ReturnType<typeof useContentEngine> }) {
  const [theme, setTheme] = useState("");
  const [pillar, setPillar] = useState("ai_business");
  const [numSlides, setNumSlides] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [slides, setSlides] = useState<Array<{ slideNumber: number; headline: string; body: string; accent?: string; type: string }>>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editHeadline, setEditHeadline] = useState("");
  const [editBody, setEditBody] = useState("");

  const SLIDE_COLORS: Record<string, { bg: string; accent: string }> = {
    ai_business: { bg: "from-indigo-950 to-slate-950", accent: "text-indigo-400" },
    alternative_assets: { bg: "from-emerald-950 to-slate-950", accent: "text-emerald-400" },
    entrepreneurship: { bg: "from-amber-950 to-slate-950", accent: "text-amber-400" },
  };

  const handleGenerate = async () => {
    if (!theme.trim()) return;
    setGenerating(true);
    try {
      const result = await engine.generateCarousel(theme, pillar, numSlides);
      setSlides(result);
      setCurrentSlide(0);
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
    setGenerating(false);
  };

  const startEditSlide = (i: number) => {
    setEditingSlide(i);
    setEditHeadline(slides[i].headline);
    setEditBody(slides[i].body);
  };

  const saveSlideEdit = () => {
    if (editingSlide === null) return;
    const updated = [...slides];
    updated[editingSlide] = { ...updated[editingSlide], headline: editHeadline, body: editBody };
    setSlides(updated);
    setEditingSlide(null);
  };

  const colors = SLIDE_COLORS[pillar] || SLIDE_COLORS.ai_business;

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-white tracking-tight mb-6">Gerador de Carrossel</h1>

      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 mb-4">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tema do carrossel</label>
        <textarea
          className="w-full p-3 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm resize-y focus:border-indigo-500 placeholder-slate-600"
          rows={2}
          placeholder="Ex: 5 sinais de que sua fintech precisa de AI na operação..."
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        />

        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-2">Pilar</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(PILLARS).map(([key, { label, color }]) => (
                <button
                  key={key}
                  onClick={() => setPillar(key)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                  style={{
                    background: pillar === key ? color + "22" : "transparent",
                    color: pillar === key ? color : "#94a3b8",
                    borderColor: pillar === key ? color + "55" : "#334155",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">Slides</label>
            <select
              value={numSlides}
              onChange={(e) => setNumSlides(parseInt(e.target.value))}
              className="p-2 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm"
            >
              {[5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n} slides</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !theme.trim()}
          className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#0a0e17] rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-slate-200 transition"
        >
          {generating ? "Gerando carrossel..." : "▦ Gerar carrossel"}
        </button>
      </div>

      {/* CAROUSEL PREVIEW */}
      {slides.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Preview</h2>

          {/* Slide display */}
          <div className={`bg-gradient-to-br ${colors.bg} rounded-xl p-6 md:p-8 aspect-square max-w-sm md:max-w-md mx-auto flex flex-col justify-center items-center text-center mb-4 border border-[#1e293b] relative`}>
            {/* Slide number */}
            <div className="absolute top-4 right-4 text-xs text-slate-500">
              {currentSlide + 1}/{slides.length}
            </div>

            {/* Author tag on cover */}
            {slides[currentSlide]?.type === "cover" && (
              <div className="absolute top-4 left-4 text-xs text-slate-500 flex items-center gap-1">
                ⚡ Eric Bueno
              </div>
            )}

            {slides[currentSlide]?.accent && (
              <div className="text-3xl mb-4">{slides[currentSlide].accent}</div>
            )}

            <h2 className={`text-2xl font-bold text-white mb-3 leading-tight ${slides[currentSlide]?.type === "cover" ? "text-3xl" : ""}`}>
              {slides[currentSlide]?.headline}
            </h2>

            {slides[currentSlide]?.body && (
              <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
                {slides[currentSlide].body}
              </p>
            )}

            {slides[currentSlide]?.type === "cta" && (
              <div className="mt-4 text-xs text-slate-500">
                Salva pra consultar depois ↗
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-3 mb-4">
            <button
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
              className="px-3 py-1.5 bg-[#1e293b] text-white rounded-md text-sm disabled:opacity-30"
            >
              ←
            </button>
            <div className="flex gap-1">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition ${i === currentSlide ? "bg-white" : "bg-slate-600"}`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
              disabled={currentSlide === slides.length - 1}
              className="px-3 py-1.5 bg-[#1e293b] text-white rounded-md text-sm disabled:opacity-30"
            >
              →
            </button>
          </div>

          {/* Slide list for editing */}
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 mt-6">Editar slides</h2>
          {slides.map((slide, i) => (
            <div key={i} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 mb-2">
              {editingSlide === i ? (
                <div>
                  <input
                    className="w-full p-2 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-white text-sm font-semibold mb-2 focus:border-indigo-500"
                    value={editHeadline}
                    onChange={(e) => setEditHeadline(e.target.value)}
                  />
                  <textarea
                    className="w-full p-2 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm mb-2 resize-y focus:border-indigo-500"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button onClick={saveSlideEdit} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs">Salvar</button>
                    <button onClick={() => setEditingSlide(null)} className="px-3 py-1 text-slate-500 text-xs">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => { startEditSlide(i); setCurrentSlide(i); }}>
                  <span className="text-xs text-slate-600 font-mono mt-0.5">{i + 1}</span>
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">{slide.headline}</div>
                    {slide.body && <div className="text-slate-400 text-xs mt-1">{slide.body}</div>}
                  </div>
                  <span className="text-[10px] text-slate-600 uppercase">{slide.type}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== ANALYTICS TAB =====
function AnalyticsTab({ engine }: { engine: ReturnType<typeof useContentEngine> }) {
  const [linkedInToken, setLinkedInToken] = useState(() => {
    try { return localStorage.getItem("ce-linkedin-token") || ""; } catch { return ""; }
  });
  const [instaToken, setInstaToken] = useState(() => {
    try { return localStorage.getItem("ce-instagram-token") || ""; } catch { return ""; }
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [manualMetrics, setManualMetrics] = useState<Record<string, any>>({});
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [metricForm, setMetricForm] = useState({ impressions: "", likes: "", comments: "", shares: "", saves: "" });

  // Check URL for OAuth tokens on mount
  useState(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const liToken = params.get("linkedin_token");
    const igToken = params.get("instagram_token");
    if (liToken) { setLinkedInToken(liToken); localStorage.setItem("ce-linkedin-token", liToken); }
    if (igToken) { setInstaToken(igToken); localStorage.setItem("ce-instagram-token", igToken); }
    if (liToken || igToken) window.history.replaceState({}, "", "/");
  });

  const approved = engine.contentList.filter((c) => c.status === "approved" || c.status === "published");

  const saveManualMetric = (id: string) => {
    const parsedMetrics = {
      ...metricForm,
      impressions: parseInt(metricForm.impressions) || 0,
      likes: parseInt(metricForm.likes) || 0,
      comments: parseInt(metricForm.comments) || 0,
      shares: parseInt(metricForm.shares) || 0,
      saves: parseInt(metricForm.saves) || 0,
    };
    const metrics = {
      ...parsedMetrics,
      engagement_rate: parsedMetrics.impressions
        ? ((parsedMetrics.likes + parsedMetrics.comments + parsedMetrics.shares) / parsedMetrics.impressions) * 100
        : 0,
    };

    const updated = { ...manualMetrics, [id]: metrics };
    setManualMetrics(updated);
    try { localStorage.setItem("ce-manual-metrics", JSON.stringify(updated)); } catch {}
    setEditingMetric(null);
    setMetricForm({ impressions: "", likes: "", comments: "", shares: "", saves: "" });
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    const contentWithMetrics = approved.map((c) => ({
      ...c,
      metrics: manualMetrics[c.id] || null,
    })).filter((c) => c.metrics);

    if (contentWithMetrics.length === 0) {
      alert("Adicione métricas a pelo menos 3 posts antes de rodar a análise.");
      setAnalyzing(false);
      return;
    }

    try {
      const result = await engine.analyzePerformance(contentWithMetrics);
      setAnalysis(result);
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
    setAnalyzing(false);
  };

  // Load manual metrics from localStorage
  useState(() => {
    try {
      const stored = localStorage.getItem("ce-manual-metrics");
      if (stored) setManualMetrics(JSON.parse(stored));
    } catch {}
  });

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-white tracking-tight mb-6">Analytics</h1>

      {/* Social connections */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 md:p-5 mb-4">
        <h3 className="text-sm font-semibold text-white mb-3">Conexões sociais</h3>
        {socialError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3 text-xs text-red-400">
            {socialError}
          </div>
        )}
        <div className="flex gap-2 md:gap-3 flex-wrap">
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/social/linkedin?action=check");
                const data = await res.json();
                if (data.configured) {
                  engine.connectLinkedIn();
                } else {
                  setSocialError("LinkedIn não configurado. Adicione LINKEDIN_CLIENT_ID e LINKEDIN_CLIENT_SECRET nas variáveis de ambiente da Vercel.");
                }
              } catch {
                setSocialError("LinkedIn não configurado. Adicione as variáveis de ambiente primeiro.");
              }
            }}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs font-medium border transition ${
              linkedInToken
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-[#1e293b] text-slate-400 border-[#334155] hover:text-white"
            }`}
          >
            💼 {linkedInToken ? "LinkedIn ✓" : "Conectar LinkedIn"}
          </button>
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/social/instagram?action=check");
                const data = await res.json();
                if (data.configured) {
                  engine.connectInstagram();
                } else {
                  setSocialError("Instagram não configurado. Adicione FACEBOOK_APP_ID e FACEBOOK_APP_SECRET nas variáveis de ambiente da Vercel.");
                }
              } catch {
                setSocialError("Instagram não configurado. Adicione as variáveis de ambiente primeiro.");
              }
            }}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs font-medium border transition ${
              instaToken
                ? "bg-pink-500/10 text-pink-400 border-pink-500/20"
                : "bg-[#1e293b] text-slate-400 border-[#334155] hover:text-white"
            }`}
          >
            📸 {instaToken ? "Instagram ✓" : "Conectar Instagram"}
          </button>
        </div>
        <p className="text-[11px] text-slate-600 mt-2">
          Configure as API keys em AI Config ou nas variáveis de ambiente. Métricas manuais funcionam sem conexão.
        </p>
      </div>

      {/* Manual metrics entry */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-white">Métricas dos posts</h3>
          <button
            onClick={runAnalysis}
            disabled={analyzing || Object.keys(manualMetrics).length < 2}
            className="px-4 py-2 bg-white text-[#0a0e17] rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-slate-200 transition"
          >
            {analyzing ? "Analisando..." : "📊 Rodar análise com AI"}
          </button>
        </div>

        {approved.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum post aprovado ainda.</p>
        ) : (
          approved.slice(0, 15).map((item) => {
            const hasMetrics = !!manualMetrics[item.id];
            const m = manualMetrics[item.id];

            return (
              <div key={item.id} className="border-b border-[#1e293b] py-3 last:border-0">
                <div className="flex items-start gap-2">
                  <span className="text-sm">{CHANNELS[item.channel]?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{item.body?.slice(0, 80)}...</p>
                    {hasMetrics && (
                      <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500">
                        <span>👁 {m.impressions}</span>
                        <span>❤️ {m.likes}</span>
                        <span>💬 {m.comments}</span>
                        <span>🔄 {m.shares}</span>
                        <span>📌 {m.saves}</span>
                        <span className="text-emerald-500">{m.engagement_rate?.toFixed(1)}% eng</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (editingMetric === item.id) { setEditingMetric(null); return; }
                      setEditingMetric(item.id);
                      if (m) {
                        setMetricForm({
                          impressions: String(m.impressions || ""),
                          likes: String(m.likes || ""),
                          comments: String(m.comments || ""),
                          shares: String(m.shares || ""),
                          saves: String(m.saves || ""),
                        });
                      } else {
                        setMetricForm({ impressions: "", likes: "", comments: "", shares: "", saves: "" });
                      }
                    }}
                    className="text-xs text-slate-500 hover:text-white transition shrink-0"
                  >
                    {hasMetrics ? "✎" : "+ métricas"}
                  </button>
                </div>

                {editingMetric === item.id && (
                  <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
                    {(["impressions", "likes", "comments", "shares", "saves"] as const).map((field) => (
                      <div key={field}>
                        <label className="block text-[10px] text-slate-500 mb-1">{field === "impressions" ? "👁" : field === "likes" ? "❤️" : field === "comments" ? "💬" : field === "shares" ? "🔄" : "📌"}</label>
                        <input
                          className="w-full p-1.5 bg-[#0a0e17] border border-[#1e293b] rounded text-slate-200 text-xs text-center focus:border-indigo-500"
                          type="number"
                          value={metricForm[field]}
                          onChange={(e) => setMetricForm({ ...metricForm, [field]: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => saveManualMetric(item.id)}
                      className="col-span-3 md:col-span-5 mt-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded text-xs hover:bg-emerald-500/20 transition"
                    >
                      Salvar métricas
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* AI Analysis results */}
      {analysis && (
        <div className="space-y-3">
          <div className="bg-[#111827] border border-indigo-500/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">📊 Análise de Performance</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Pillar performance */}
          {analysis.pillar_performance && (
            <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Performance por pilar</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(analysis.pillar_performance).map(([key, data]: [string, any]) => (
                  <div key={key} className="text-center p-3 bg-[#0a0e17] rounded-lg">
                    <div className="text-xs mb-1" style={{ color: PILLARS[key]?.color }}>{PILLARS[key]?.label}</div>
                    <div className="text-lg font-bold text-white">{data.avg_engagement?.toFixed(1) || "—"}%</div>
                    <div className="text-[10px] text-slate-500">
                      {data.trend === "up" ? "📈 Subindo" : data.trend === "down" ? "📉 Caindo" : "→ Estável"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {analysis.patterns?.length > 0 && (
            <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">🔍 Padrões identificados</h3>
              {analysis.patterns.map((p: any, i: number) => (
                <div key={i} className="p-3 bg-[#0a0e17] rounded-lg mb-2">
                  <p className="text-sm text-slate-200">{p.pattern}</p>
                  <p className="text-xs text-emerald-400 mt-1">→ {p.action}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">💡 Recomendações</h3>
              {analysis.recommendations.map((r: any, i: number) => (
                <div key={i} className="p-3 bg-[#0a0e17] rounded-lg mb-2">
                  <span className="text-[10px] text-slate-500 uppercase">{r.type}</span>
                  <p className="text-sm text-slate-200 mt-1">{r.suggestion}</p>
                </div>
              ))}
            </div>
          )}

          {/* Voice suggestions */}
          {analysis.voice_suggestions?.length > 0 && (
            <div className="bg-[#111827] border border-emerald-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">🧠 Sugestões pro Voice Profile</h3>
              {analysis.voice_suggestions.map((s: string, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-[#0a0e17] rounded-lg mb-2">
                  <span className="text-sm text-slate-300 flex-1">{s}</span>
                  <button
                    onClick={() => engine.addVoiceRule(s)}
                    className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] hover:bg-emerald-500/20 transition shrink-0"
                  >
                    + Adicionar
                  </button>
                </div>
              ))}
            </div>
          )}

          {analysis.best_day && (
            <p className="text-xs text-slate-500 text-center">
              📅 Melhor dia pra postar: <strong className="text-slate-300">{analysis.best_day}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ===== LLM CONFIG TAB =====
function LLMConfigTab() {
  const [config, setConfig] = useState<LLMConfig>(() => {
    try {
      const stored = localStorage.getItem("ce-llm-config");
      return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });
  const [showKey, setShowKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");

  const saveConfig = (newConfig: LLMConfig) => {
    setConfig(newConfig);
    try { localStorage.setItem("ce-llm-config", JSON.stringify(newConfig)); } catch {}
  };

  const saveApiKey = (providerId: string) => {
    saveConfig({
      ...config,
      apiKeys: { ...config.apiKeys, [providerId]: keyInput },
    });
    setEditingKey(null);
    setKeyInput("");
  };

  const removeApiKey = (providerId: string) => {
    const keys = { ...config.apiKeys };
    delete keys[providerId];
    saveConfig({ ...config, apiKeys: keys });
  };

  const setRoute = (task: string, modelId: string) => {
    saveConfig({
      ...config,
      routes: { ...config.routes, [task]: modelId },
    });
  };

  const setPriority = (p: "speed" | "quality" | "cost") => {
    saveConfig({
      ...config,
      preferences: { ...config.preferences, prioritize: p },
    });
  };

  const TYPE_ICONS: Record<string, string> = { text: "📝", image: "🖼", video: "🎬" };
  const TYPE_LABELS: Record<string, string> = { text: "Texto", image: "Imagem", video: "Vídeo" };
  const SPEED_COLORS: Record<string, string> = { fast: "#10b981", medium: "#f59e0b", slow: "#ef4444" };
  const QUALITY_LABELS: Record<string, string> = { standard: "Padrão", high: "Alta", premium: "Premium" };

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold text-white tracking-tight mb-2">AI Config</h1>
      <p className="text-slate-400 text-sm mb-6">Configure quais modelos usar para cada tarefa. Cada tipo de conteúdo pode usar o modelo ideal.</p>

      {/* PRIORITY */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-white mb-3">Prioridade geral</h3>
        <div className="flex gap-2">
          {([
            { id: "speed", label: "⚡ Velocidade", desc: "Modelos mais rápidos" },
            { id: "quality", label: "✨ Qualidade", desc: "Melhores resultados" },
            { id: "cost", label: "💰 Custo", desc: "Mais econômico" },
          ] as const).map((p) => (
            <button
              key={p.id}
              onClick={() => setPriority(p.id)}
              className="flex-1 p-3 rounded-lg border text-left transition"
              style={{
                background: config.preferences.prioritize === p.id ? "#6366f122" : "transparent",
                borderColor: config.preferences.prioritize === p.id ? "#6366f155" : "#1e293b",
              }}
            >
              <div className="text-sm font-medium" style={{ color: config.preferences.prioritize === p.id ? "#a5b4fc" : "#94a3b8" }}>{p.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 mt-4 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={config.preferences.autoFallback}
            onChange={(e) => saveConfig({ ...config, preferences: { ...config.preferences, autoFallback: e.target.checked } })}
            className="rounded"
          />
          Auto-fallback: se o modelo configurado falhar, usar o padrão
        </label>
      </div>

      {/* API KEYS */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-white mb-1">API Keys</h3>
        <p className="text-xs text-slate-500 mb-4">Chaves ficam salvas apenas no seu browser (localStorage). Em produção, use variáveis de ambiente.</p>

        {PROVIDERS.map((provider) => {
          const hasKey = !!config.apiKeys[provider.id];
          const isEditing = editingKey === provider.id;

          return (
            <div key={provider.id} className="flex items-center gap-3 py-3 border-b border-[#1e293b] last:border-0">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{TYPE_ICONS[provider.type]}</span>
                  <span className="text-sm text-white font-medium">{provider.name}</span>
                  {hasKey && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                      conectado
                    </span>
                  )}
                </div>
                {hasKey && !isEditing && (
                  <div className="text-[11px] text-slate-600 mt-1 font-mono">
                    {showKey === provider.id
                      ? config.apiKeys[provider.id]
                      : config.apiKeys[provider.id]?.slice(0, 12) + "•••••••"
                    }
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="flex gap-2 items-center">
                  <input
                    className="w-48 p-2 bg-[#0a0e17] border border-[#1e293b] rounded text-slate-200 text-xs font-mono focus:border-indigo-500"
                    type="password"
                    placeholder="sk-..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveApiKey(provider.id)}
                    autoFocus
                  />
                  <button onClick={() => saveApiKey(provider.id)} className="px-2 py-1.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">Salvar</button>
                  <button onClick={() => { setEditingKey(null); setKeyInput(""); }} className="px-2 py-1.5 text-slate-500 text-xs">×</button>
                </div>
              ) : (
                <div className="flex gap-1">
                  {hasKey && (
                    <>
                      <button onClick={() => setShowKey(showKey === provider.id ? null : provider.id)} className="px-2 py-1 text-slate-600 hover:text-white text-xs transition">
                        {showKey === provider.id ? "🙈" : "👁"}
                      </button>
                      <button onClick={() => removeApiKey(provider.id)} className="px-2 py-1 text-slate-600 hover:text-red-400 text-xs transition">🗑</button>
                    </>
                  )}
                  <button
                    onClick={() => { setEditingKey(provider.id); setKeyInput(config.apiKeys[provider.id] || ""); }}
                    className="px-3 py-1 bg-[#1e293b] text-slate-400 border border-[#334155] rounded text-xs hover:text-white transition"
                  >
                    {hasKey ? "Editar" : "+ Adicionar"}
                  </button>
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener"
                    className="px-2 py-1 text-slate-600 hover:text-indigo-400 text-xs transition"
                    title="Documentação"
                  >
                    ?
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TASK ROUTING */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-white mb-1">Roteamento de tarefas</h3>
        <p className="text-xs text-slate-500 mb-4">Escolha qual modelo usar para cada tipo de tarefa.</p>

        {(["text", "image", "video"] as const).map((type) => {
          const routes = DEFAULT_ROUTES.filter((r) => r.type === type);
          const availableModels = PROVIDERS.filter((p) => p.type === type).flatMap((p) => p.models);

          if (routes.length === 0) return null;

          return (
            <div key={type} className="mb-6 last:mb-0">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                {TYPE_ICONS[type]} {TYPE_LABELS[type]}
              </h4>

              {routes.map((route) => {
                const currentModelId = config.routes[route.task] || route.defaultModel;
                const currentModel = availableModels.find((m) => m.id === currentModelId);
                const providerConfigured = currentModel
                  ? !!config.apiKeys[PROVIDERS.find((p) => p.models.some((m) => m.id === currentModelId))?.id || ""]
                  : false;

                return (
                  <div key={route.task} className="p-3 bg-[#0a0e17] border border-[#1e293b] rounded-lg mb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium">{route.label}</div>
                        <div className="text-[11px] text-slate-500">{route.description}</div>
                      </div>

                      <div className="shrink-0">
                        <select
                          value={currentModelId}
                          onChange={(e) => setRoute(route.task, e.target.value)}
                          className="p-1.5 bg-[#111827] border border-[#1e293b] rounded text-slate-200 text-xs focus:border-indigo-500 min-w-[180px]"
                        >
                          {availableModels.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name} ({model.provider})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Model info bar */}
                    {currentModel && (
                      <div className="flex items-center gap-3 mt-2 text-[10px]">
                        <span style={{ color: SPEED_COLORS[currentModel.speed] }}>
                          {currentModel.speed === "fast" ? "⚡ Rápido" : currentModel.speed === "medium" ? "⏱ Médio" : "🐢 Lento"}
                        </span>
                        <span className="text-slate-500">
                          ✨ {QUALITY_LABELS[currentModel.quality]}
                        </span>
                        {currentModel.costPer1k && (
                          <span className="text-slate-600">
                            💰 ~{currentModel.costPer1k}
                          </span>
                        )}
                        {!providerConfigured && (
                          <span className="text-amber-400">
                            ⚠ API key não configurada
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* RESET */}
      <button
        onClick={() => {
          if (confirm("Resetar todas as configurações de AI?")) {
            saveConfig(DEFAULT_CONFIG);
          }
        }}
        className="flex items-center gap-2 px-4 py-2 text-red-400 border border-red-500/20 rounded-lg text-xs hover:bg-red-500/10 transition"
      >
        🗑 Resetar configurações
      </button>
    </div>
  );
}

// ===== SHARED COMPONENTS =====
function ContentPreviewCard({ item, metrics }: { item: ContentItem; metrics?: any }) {
  const status = STATUS_MAP[item.status] || STATUS_MAP.draft;
  const dateStr = item.scheduled_at || item.created_at;
  const dateLabel = dateStr ? new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "";

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-3.5 mb-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">{CHANNELS[item.channel]?.emoji}</span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase"
          style={{ background: status.color + "22", color: status.color }}>
          {status.label}
        </span>
        {item.pillar && (
          <span className="text-[11px]" style={{ color: PILLARS[item.pillar]?.color }}>
            {PILLARS[item.pillar]?.label}
          </span>
        )}
        <span className="text-[10px] text-slate-600 ml-auto">{dateLabel}</span>
        {item.rating && item.rating > 0 && (
          <span className="text-amber-400 text-[11px]">{"★".repeat(item.rating)}</span>
        )}
      </div>
      <p className="text-slate-400 text-xs leading-relaxed">{item.body?.slice(0, 140)}...</p>
      {metrics && (
        <div className="flex gap-3 text-[10px] text-slate-500 border-t border-[#1e293b] pt-1.5 mt-1.5">
          <span>👁 {metrics.impressions || 0}</span>
          <span>❤️ {metrics.likes || 0}</span>
          <span>💬 {metrics.comments || 0}</span>
          <span className="text-emerald-500">{(metrics.engagement_rate || 0).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 mb-3">
      <h3 className="text-sm font-semibold text-white mb-0.5">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

function RuleItem({ text, onRemove, danger }: { text: string; onRemove: () => void; danger?: boolean }) {
  return (
    <div className={`flex items-center p-2.5 bg-[#0a0e17] border rounded-md mb-1.5 text-sm ${danger ? "border-red-500/20 text-red-300" : "border-[#1e293b] text-slate-300"}`}>
      <span className="flex-1">{text}</span>
      <button onClick={onRemove} className="text-slate-600 hover:text-red-400 text-xs ml-2">×</button>
    </div>
  );
}

function AddRow({ value, onChange, placeholder, onAdd }: { value: string; onChange: (v: string) => void; placeholder: string; onAdd: () => void }) {
  return (
    <div className="flex gap-2 mt-2">
      <input
        className="flex-1 p-2.5 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-slate-200 text-sm focus:border-indigo-500 placeholder-slate-600"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
      />
      <button onClick={onAdd} className="px-3 py-2 bg-[#1e293b] text-white border border-[#334155] rounded-lg text-sm hover:bg-[#334155] transition shrink-0">
        +
      </button>
    </div>
  );
}
