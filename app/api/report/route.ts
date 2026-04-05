import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { period = "week" } = body;

    const supabase = createServerClient();

    // Get date range
    const now = new Date();
    const daysBack = period === "month" ? 30 : 7;
    const since = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // Fetch published posts with analytics
    const { data: posts } = await supabase
      .from("content")
      .select("*, analytics(*)")
      .gte("published_at", since)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    // Fetch goals
    const { data: goals } = await supabase
      .from("goals")
      .select("*")
      .eq("status", "active");

    // Fetch voice profile
    const { data: voiceProfiles } = await supabase
      .from("voice_profiles")
      .select("*")
      .order("version", { ascending: false })
      .limit(1);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `Você é o analista de conteúdo do Eric Bueno. Gere um relatório ${period === "month" ? "mensal" : "semanal"} de performance.

Eric é empreendedor/investidor em fintech e ativos alternativos. Pilares: AI + Negócios, Ativos Alternativos, Empreendedorismo.

Tom: direto, acionável, sem enrolação. Destaque o que funcionou, o que não, e o que mudar.

Responda em JSON (sem markdown):
{
  "summary": "resumo executivo em 3-4 frases",
  "highlights": [{ "title": "destaque", "detail": "por que foi bom", "metric": "dado" }],
  "lowlights": [{ "title": "ponto fraco", "detail": "o que aconteceu", "suggestion": "o que fazer" }],
  "best_post": { "channel": "canal", "preview": "texto curto", "why": "por que performou" },
  "pillar_analysis": {
    "ai_business": { "posts": 0, "avg_engagement": 0, "trend": "up|down|stable" },
    "alternative_assets": { "posts": 0, "avg_engagement": 0, "trend": "up|down|stable" },
    "entrepreneurship": { "posts": 0, "avg_engagement": 0, "trend": "up|down|stable" }
  },
  "channel_analysis": {
    "linkedin": { "posts": 0, "total_impressions": 0, "avg_engagement": 0 },
    "twitter": { "posts": 0, "total_impressions": 0, "avg_engagement": 0 },
    "instagram": { "posts": 0, "total_impressions": 0, "avg_engagement": 0 }
  },
  "recommendations": [{ "priority": "high|medium|low", "action": "o que fazer", "expected_impact": "impacto" }],
  "voice_insights": ["insight sobre tom de voz baseado no que funcionou"],
  "next_week_themes": ["tema sugerido pra próxima semana"],
  "goal_progress": { "on_track": true, "detail": "análise do progresso" }
}`,
      messages: [
        {
          role: "user",
          content: `Gere o relatório ${period === "month" ? "mensal" : "semanal"}.

Posts publicados (${posts?.length || 0}):
${JSON.stringify(posts || [], null, 2)}

Objetivos ativos:
${JSON.stringify(goals || [], null, 2)}

Voice Profile version: ${voiceProfiles?.[0]?.version || 0}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = text.replace(/```json|```/g, "").trim();

    let report;
    try {
      report = JSON.parse(cleaned);
    } catch {
      report = { summary: cleaned.slice(0, 500), highlights: [], recommendations: [] };
    }

    return NextResponse.json({ report, period, postsAnalyzed: posts?.length || 0 });
  } catch (error: any) {
    console.error("Report error:", error);
    return NextResponse.json({ error: error.message || "Report generation failed" }, { status: 500 });
  }
}
