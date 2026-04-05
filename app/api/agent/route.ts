import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

/** Concatena blocos de texto (ignora tool_use etc.). */
function concatTextFromContent(content: unknown[]): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (b): b is { type: "text"; text: string } =>
        typeof b === "object" &&
        b !== null &&
        (b as { type?: string }).type === "text" &&
        typeof (b as { text?: string }).text === "string"
    )
    .map((b) => b.text)
    .join("\n");
}

/** Parse JSON mesmo quando o modelo envolve em markdown ou texto extra. */
function parseJsonObject(raw: string): Record<string, unknown> {
  const stripped = raw.replace(/```json\s*|```/gi, "").trim();
  const parseObj = (s: string) => {
    const o = JSON.parse(s);
    if (typeof o !== "object" || o === null || Array.isArray(o)) {
      throw new Error("Resposta não é um objeto JSON.");
    }
    return o as Record<string, unknown>;
  };
  try {
    return parseObj(stripped);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return parseObj(stripped.slice(start, end + 1));
    }
  }
  throw new Error(
    "O modelo não devolveu JSON válido. Tente de novo ou encurte o texto da meta."
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ─── STAGE 1: INTERPRET GOAL ───
    if (action === "interpret_goal") {
      const { goalText, currentMetrics } = body;
      const client = getAnthropic();
      if (!client) {
        return NextResponse.json(
          {
            error:
              "ANTHROPIC_API_KEY não configurada. Adicione em Vercel → Environment Variables (ou .env.local).",
          },
          { status: 503 }
        );
      }

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 1000,
        system: `Você é o agente planejador de conteúdo do Eric Bueno.
Eric é empreendedor, investidor, sócio de fintech de microcrédito. Pilares: AI + Negócios, Ativos Alternativos, Empreendedorismo.

O Eric vai te dar uma meta em texto livre. Interprete e transforme em KPIs mensuráveis.

Responda APENAS JSON (sem markdown):
{
  "interpreted_goal": "o que você entendeu",
  "kpis": [
    { "metric": "nome da métrica", "current": 0, "target": 0, "unit": "unidade" }
  ],
  "strategy": "estratégia em 2-3 frases",
  "content_mix": {
    "linkedin": { "posts_per_week": 0, "formats": ["post", "carousel", "article"] },
    "twitter": { "posts_per_week": 0, "formats": ["tweet", "thread"] },
    "instagram": { "posts_per_week": 0, "formats": ["carousel", "reel", "story"] }
  },
  "pillar_weight": { "ai_business": 0.4, "alternative_assets": 0.3, "entrepreneurship": 0.3 },
  "tone_adjustments": ["ajuste de tom sugerido"],
  "risks": ["risco ou ressalva"]
}`,
        messages: [{ role: "user", content: `Meta do Eric: "${goalText}"\n\nMétricas atuais: ${JSON.stringify(currentMetrics || {})}` }],
      });

      const text = concatTextFromContent(message.content as unknown[]);
      if (!text.trim()) {
        return NextResponse.json(
          { error: "Resposta vazia do modelo. Verifique o modelo e a API key." },
          { status: 502 }
        );
      }
      try {
        const plan = parseJsonObject(text);
        return NextResponse.json({ plan });
      } catch (e: any) {
        return NextResponse.json(
          { error: e?.message || "JSON inválido na resposta do modelo." },
          { status: 422 }
        );
      }
    }

    // ─── STAGE 2: BUILD MONTHLY SCHEDULE ───
    if (action === "build_schedule") {
      const client = getAnthropic();
      if (!client) {
        return NextResponse.json(
          {
            error:
              "ANTHROPIC_API_KEY não configurada. Adicione em Vercel → Environment Variables (ou .env.local).",
          },
          { status: 503 }
        );
      }

      const { goal, pastPerformance, voiceProfile, month, year } = body;

      // Step 1: Research current themes
      const researchMsg = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search" } as any],
        messages: [{ role: "user", content: `Pesquise os 15 temas mais relevantes desta semana e tendências do próximo mês para: AI aplicada a negócios e fintechs, ativos alternativos (precatórios, FIDCs, consórcios), empreendedorismo e gestão de fintech. Foque em Brasil e mercado global.` }],
      } as any);

      const researchText = researchMsg.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n");

      // Step 2: Build schedule using research + past performance + goal
      const scheduleMsg = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: `Você é o agente planejador de conteúdo do Eric Bueno. Sua missão é criar o cronograma completo do mês.

CONTEXTO DO ERIC:
Empreendedor, investidor, sócio de fintech (Trigo Dourado). Fez exit. Advisor em tech. Investe em ativos alternativos.
Pilares: AI + Negócios | Ativos Alternativos | Empreendedorismo/Gestão

META DO MÊS: ${JSON.stringify(goal)}

PERFORMANCE PASSADA (o que funcionou):
${JSON.stringify(pastPerformance || {})}

VOICE PROFILE v${voiceProfile?.version || 0}:
Regras: ${JSON.stringify(voiceProfile?.rules || [])}

PESQUISA DE TEMAS ATUAIS:
${researchText}

REGRAS DO CRONOGRAMA:
- Distribua posts ao longo do mês (não concentre tudo no início)
- LinkedIn: terça a quinta performam melhor, 8h-10h ou 17h-19h
- Twitter/X: qualquer dia, múltiplos horários
- Instagram: terça, quarta, quinta, 12h ou 18h-20h
- Alterne entre pilares conforme o peso definido na meta
- Varie formatos: post texto, carrossel, thread, reel
- Cada tema deve ter um briefing claro do que abordar
- Inclua 2-3 posts oportunísticos (slots marcados como "oportunístico" sem tema fixo)
- Total de posts deve seguir o content_mix da meta

Responda APENAS JSON (sem markdown):
{
  "schedule": [
    {
      "id": "unique_id",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "channel": "linkedin|twitter|instagram",
      "pillar": "ai_business|alternative_assets|entrepreneurship",
      "format": "post|carousel|thread|reel|story",
      "theme": "título curto do tema",
      "briefing": "o que abordar, ângulo, gancho",
      "source_context": "de onde veio a ideia (pesquisa, tendência, etc)",
      "priority": "high|medium|low",
      "is_opportunistic": false
    }
  ],
  "strategy_notes": "notas sobre a estratégia do mês",
  "weekly_breakdown": {
    "week1": { "focus": "foco da semana", "posts": 0 },
    "week2": { "focus": "foco", "posts": 0 },
    "week3": { "focus": "foco", "posts": 0 },
    "week4": { "focus": "foco", "posts": 0 }
  }
}`,
        messages: [{
          role: "user",
          content: `Crie o cronograma completo para ${month}/${year}. Use a pesquisa de temas, a performance passada e a meta pra montar o plano ideal.`,
        }],
      });

      const schedText = concatTextFromContent(scheduleMsg.content as unknown[]);
      let schedule: Record<string, unknown>;
      try {
        schedule = parseJsonObject(schedText || "{}");
      } catch {
        schedule = {
          schedule: [],
          strategy_notes: (schedText || "").slice(0, 500),
        };
      }

      return NextResponse.json({ schedule });
    }

    // ─── STAGE 4: PRODUCE CONTENT FOR APPROVED THEMES ───
    if (action === "produce_content") {
      const client = getAnthropic();
      if (!client) {
        return NextResponse.json(
          {
            error:
              "ANTHROPIC_API_KEY não configurada. Adicione em Vercel → Environment Variables (ou .env.local).",
          },
          { status: 503 }
        );
      }

      const { theme, channel, format, briefing, voiceProfile, goal } = body;

      const voiceRules = voiceProfile?.rules?.length
        ? `\nREGRAS DE VOZ: ${voiceProfile.rules.join("; ")}`
        : "";
      const antiPatterns = voiceProfile?.anti_patterns?.length
        ? `\nNUNCA USE: ${voiceProfile.anti_patterns.join("; ")}`
        : "";
      const goldExamples = voiceProfile?.examples?.filter((e: any) => e.rating >= 4).slice(-3);
      const examplesBlock = goldExamples?.length
        ? `\nEXEMPLOS DE REFERÊNCIA:\n${goldExamples.map((e: any) => `---\n${e.text}\n---`).join("\n")}`
        : "";

      const formatInstructions: Record<string, string> = {
        post: "Post texto. LinkedIn: 1200-1800 chars. Twitter: max 280. Instagram: 200-400 palavras.",
        carousel: "Conteúdo de carrossel. 7-10 slides. Slide 1: hook provocativo (max 8 palavras). Intermediários: 1 ideia por slide, headline curta + body curto. Último: CTA sutil. Responda como JSON array: [{slideNumber, headline, body, type}]",
        thread: "Thread de 4-6 tweets. Cada um max 280 chars. Primeiro tweet funciona sozinho como gancho. Numere: 1/N",
        reel: "Script de Reel. Hook nos 2 primeiros segundos. Roteiro de 15-30s. Inclua text overlays sugeridos.",
        story: "Copy curta para Story. Max 2-3 frases. Pode incluir enquete ou pergunta interativa.",
      };

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: `Você é o ghostwriter do Eric Bueno. Escreva COMO SE FOSSE O ERIC.

QUEM É ERIC: Empreendedor, investidor, sócio de fintech de microcrédito. Fez exit. Advisor em tech.
TOM: Técnico mas acessível. Direto. Confiante sem arrogância. Nerd orgulhoso.
GUARDRAILS: Nunca guru/coach. Nunca dados sensíveis. Nunca política. Nunca raso. Nunca influencer.
${voiceRules}${antiPatterns}${examplesBlock}

META DO MÊS: ${goal?.interpreted_goal || "Crescer presença digital"}

FORMATO: ${formatInstructions[format] || formatInstructions.post}

Responda APENAS com o conteúdo. Sem explicações.`,
        messages: [{
          role: "user",
          content: `Tema: ${theme}\nBriefing: ${briefing}\nCanal: ${channel}\nFormato: ${format}`,
        }],
      });

      const content = concatTextFromContent(message.content as unknown[]);
      return NextResponse.json({ content, format, channel });
    }

    // ─── STAGE 6: PROGRESS REPORT ───
    if (action === "progress_report") {
      const client = getAnthropic();
      if (!client) {
        return NextResponse.json(
          {
            error:
              "ANTHROPIC_API_KEY não configurada. Adicione em Vercel → Environment Variables (ou .env.local).",
          },
          { status: 503 }
        );
      }

      const { goal, publishedPosts, metrics, weekNumber } = body;

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: `Você é o analista de performance do Eric. Gere um report de progresso comparando com a meta do mês.

Responda em JSON (sem markdown):
{
  "summary": "resumo em 3 frases",
  "goal_progress": [
    { "kpi": "nome", "target": 0, "current": 0, "pct": 0, "on_track": true }
  ],
  "top_3_posts": [{ "preview": "texto curto", "channel": "canal", "engagement": 0, "why": "por que performou" }],
  "what_worked": ["insight"],
  "what_to_adjust": ["ajuste"],
  "next_week_focus": "onde focar na próxima semana",
  "confidence_score": 0.0-1.0
}`,
        messages: [{
          role: "user",
          content: `Meta: ${JSON.stringify(goal)}\nSemana: ${weekNumber}\nPosts publicados: ${JSON.stringify(publishedPosts || [])}\nMétricas: ${JSON.stringify(metrics || {})}`,
        }],
      });

      const text = concatTextFromContent(message.content as unknown[]);
      let report: Record<string, unknown>;
      try {
        report = parseJsonObject(text || "{}");
      } catch {
        report = { summary: text || "" };
      }
      return NextResponse.json({ report });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Agent error:", error);
    return NextResponse.json({ error: error.message || "Agent failed" }, { status: 500 });
  }
}
