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

    // ─── STAGE 2: BUILD WEEKLY SCHEDULE (week 1-4) ───
    if (action === "build_schedule") {
      const client = getAnthropic();
      if (!client) {
        return NextResponse.json(
          { error: "ANTHROPIC_API_KEY não configurada. Adicione em Vercel → Environment Variables (ou .env.local)." },
          { status: 503 }
        );
      }

      const { goal, pastPerformance, voiceProfile, month, year, week, researchCache } = body;
      // week: 1 | 2 | 3 | 4
      const weekNum = Number(week) || 1;

      // Calculate date range for this week
      const firstDay = new Date(year, month - 1, 1);
      const weekStart = new Date(firstDay);
      weekStart.setDate(1 + (weekNum - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const dateRange = `${fmt(weekStart)} a ${fmt(weekEnd)}`;

      // Only research on week 1 (or if no cache provided)
      let researchText = researchCache || "";
      if (weekNum === 1 || !researchText) {
        const researchMsg = await client.messages.create({
          model: MODEL,
          max_tokens: 1500,
          tools: [{ type: "web_search_20250305", name: "web_search" } as any],
          messages: [{ role: "user", content: `Pesquise os 10 temas mais relevantes desta semana para: AI aplicada a negócios, ativos alternativos (precatórios, FIDCs, consórcios), empreendedorismo em fintech. Foco Brasil e mercado global. Semana de ${dateRange}.` }],
        } as any);
        researchText = researchMsg.content
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n");
      }

      const skillsBlock = voiceProfile?.skills?.length
        ? `\nSKILLS ATIVOS DO AGENTE:\n${voiceProfile.skills.map((s: any) => `- ${s.name}: ${s.instructions}`).join("\n")}`
        : "";

      const scheduleMsg = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: `Você é o agente planejador de conteúdo do Eric Bueno.

CONTEXTO:
Empreendedor, investidor, sócio de fintech (Trigo Dourado). Pilares: AI + Negócios | Ativos Alternativos | Empreendedorismo/Gestão

META: ${JSON.stringify(goal)}
PERFORMANCE PASSADA: ${JSON.stringify(pastPerformance || {})}
VOICE PROFILE v${voiceProfile?.version || 0}: regras=${JSON.stringify(voiceProfile?.rules || [])}${skillsBlock}

PESQUISA DA SEMANA:
${researchText}

REGRAS:
- LinkedIn: terça a quinta, 8h-10h ou 17h-19h
- Instagram: terça/quarta/quinta, 12h ou 18h-20h
- Twitter: qualquer dia
- Varie formatos (post, carousel, thread, reel, story)
- Um post pode ser "oportunístico" sem tema fixo
- Distribua datas APENAS dentro do intervalo: ${dateRange}
- IMPORTANTE: gere APENAS os posts da Semana ${weekNum}

Responda APENAS JSON sem markdown:
{
  "week": ${weekNum},
  "date_range": "${dateRange}",
  "focus": "foco temático desta semana em 1 frase",
  "schedule": [
    {
      "id": "w${weekNum}_1",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "channel": "linkedin|twitter|instagram",
      "pillar": "ai_business|alternative_assets|entrepreneurship",
      "format": "post|carousel|thread|reel|story",
      "theme": "título curto",
      "briefing": "o que abordar, ângulo, gancho sugerido",
      "source_context": "origem da ideia",
      "priority": "high|medium|low",
      "is_opportunistic": false
    }
  ]
}`,
        messages: [{
          role: "user",
          content: `Crie o plano da Semana ${weekNum} (${dateRange}) para ${month}/${year}.`,
        }],
      });

      const schedText = concatTextFromContent(scheduleMsg.content as unknown[]);
      let weekSchedule: Record<string, unknown>;
      try {
        weekSchedule = parseJsonObject(schedText || "{}");
      } catch {
        weekSchedule = { week: weekNum, schedule: [], focus: "" };
      }

      return NextResponse.json({ weekSchedule, researchText });
    }

    // ─── STAGE 4: PRODUCE CONTENT FOR APPROVED THEMES ───
    if (action === "produce_content") {
      const client = getAnthropic();
      if (!client) {
        return NextResponse.json(
          { error: "ANTHROPIC_API_KEY não configurada. Adicione em Vercel → Environment Variables (ou .env.local)." },
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
      const skillsBlock = voiceProfile?.skills?.length
        ? `\n\nHABILIDADES ESPECÍFICAS DO AGENTE:\n${voiceProfile.skills.map((s: any) => `## ${s.name.toUpperCase()} (${s.category})\n${s.instructions}`).join("\n\n")}`
        : "";

      const formatInstructions: Record<string, string> = {
        post: "Post texto. LinkedIn: 1200-1800 chars. Twitter: max 280. Instagram: 200-400 palavras.",
        carousel: "Carrossel. 7-10 slides. Slide 1: hook (max 8 palavras). Cada slide: 1 ideia, headline curta + body curto. Último: CTA sutil. No campo 'content', coloque o texto de cada slide separado por '---SLIDE---'.",
        thread: "Thread 4-6 tweets. Max 280 chars cada. Primeiro tweet funciona solo. Numere: 1/N. Separe por nova linha.",
        reel: "Script de Reel 15-30s. Hook nos 2 primeiros segundos. Inclua text overlays sugeridos entre [colchetes].",
        story: "Copy para Story. Max 3 frases. Inclua sugestão de enquete ou pergunta.",
      };

      const visualTypeByFormat: Record<string, string> = {
        post: channel === "instagram" ? "image" : "none",
        carousel: "carousel",
        thread: "none",
        reel: "video",
        story: "image",
      };

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 2500,
        system: `Você é o ghostwriter e diretor criativo do Eric Bueno. Escreva COMO SE FOSSE O ERIC.

QUEM É ERIC: Empreendedor, investidor, sócio de fintech de microcrédito. Fez exit. Advisor em tech.
TOM: Técnico mas acessível. Direto. Confiante sem arrogância. Nerd orgulhoso.
GUARDRAILS: Nunca guru/coach. Nunca dados sensíveis. Nunca política. Nunca raso. Nunca influencer.
${voiceRules}${antiPatterns}${examplesBlock}${skillsBlock}

META: ${goal?.interpreted_goal || "Crescer presença digital"}
CANAL: ${channel} | FORMATO: ${format}
INSTRUÇÃO DE FORMATO: ${formatInstructions[format] || formatInstructions.post}

Responda APENAS em JSON válido (sem markdown):
{
  "content": "o texto completo do post/thread/script conforme o formato",
  "style_notes": "instruções de estilo para postagem: emojis usados (se houver), formatação, linha de abertura destacada, sugestão de horário ideal, hashtags (se houver)",
  "visual_prompt": "prompt detalhado em inglês para geração de imagem ou vídeo que acompanhe este conteúdo — descreva cena, estilo visual, paleta, mood, composição. Se não precisar de visual, escreva 'N/A'.",
  "visual_type": "${visualTypeByFormat[format] || "none"}"
}`,
        messages: [{
          role: "user",
          content: `Tema: ${theme}\nBriefing: ${briefing}\nCanal: ${channel}\nFormato: ${format}`,
        }],
      });

      const raw = concatTextFromContent(message.content as unknown[]);
      let result: Record<string, unknown>;
      try {
        result = parseJsonObject(raw || "{}");
      } catch {
        // Fallback: treat raw as plain content
        result = {
          content: raw,
          style_notes: "",
          visual_prompt: "",
          visual_type: visualTypeByFormat[format] || "none",
        };
      }

      return NextResponse.json({ ...result, format, channel });
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
