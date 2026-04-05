import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Sonnet only for content writing; Haiku for everything else
const MODEL_HEAVY = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
const MODEL_LIGHT = "claude-3-haiku-20240307";

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function noKey() {
  return NextResponse.json(
    { error: "ANTHROPIC_API_KEY não configurada. Adicione em Vercel → Environment Variables." },
    { status: 503 }
  );
}

function concatText(content: unknown[]): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (b): b is { type: "text"; text: string } =>
        typeof b === "object" && b !== null &&
        (b as any).type === "text" && typeof (b as any).text === "string"
    )
    .map((b) => b.text)
    .join("\n");
}

function parseJson(raw: string): Record<string, unknown> {
  // Strip markdown code fences and trim
  let s = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

  const tryParse = (str: string): Record<string, unknown> => {
    const o = JSON.parse(str);
    if (typeof o !== "object" || o === null || Array.isArray(o)) throw new Error("not object");
    return o as Record<string, unknown>;
  };

  // 1. Direct parse
  try { return tryParse(s); } catch {}

  // 2. Extract first { ... last }
  const start = s.indexOf("{"), end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return tryParse(s.slice(start, end + 1)); } catch {}
  }

  // 3. Remove trailing commas before ] or } (common LLM mistake)
  const cleaned = s
    .replace(/,\s*([}\]])/g, "$1")   // trailing commas
    .replace(/([{\[,])\s*,/g, "$1"); // double commas
  try { return tryParse(cleaned); } catch {}
  if (start >= 0 && end > start) {
    try { return tryParse(cleaned.slice(start, end + 1)); } catch {}
  }

  throw new Error("JSON inválido na resposta do modelo. Tente novamente.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ─── 1. INTERPRET GOAL (Haiku — leve) ───
    if (action === "interpret_goal") {
      const client = getAnthropic();
      if (!client) return noKey();

      const { goalText, currentMetrics } = body;

      const msg = await client.messages.create({
        model: MODEL_LIGHT,
        max_tokens: 1000,
        system: `Você é o planejador de conteúdo digital.
Interprete a meta do usuário e defina pilares estratégicos BASEADOS NA META — não use categorias genéricas.
Retorne APENAS JSON sem markdown:
{
  "interpreted_goal": "resumo da meta em 1 frase objetiva",
  "kpis": [{ "metric": "nome do KPI", "current": 0, "target": 0, "unit": "unidade" }],
  "strategy": "como o conteúdo vai atingir a meta — 2 frases diretas",
  "content_mix": {
    "linkedin": { "posts_per_week": 3, "formats": ["post","carousel"] },
    "instagram": { "posts_per_week": 1, "formats": ["carousel","reel"] }
  },
  "pillars": [
    { "key": "pilar_slug_1", "label": "Nome Específico do Pilar 1", "weight": 0.4 },
    { "key": "pilar_slug_2", "label": "Nome Específico do Pilar 2", "weight": 0.35 },
    { "key": "pilar_slug_3", "label": "Nome Específico do Pilar 3", "weight": 0.25 }
  ]
}

REGRAS DOS PILARES:
- Gere exatamente 3 pilares derivados da meta do usuário
- Keys em snake_case sem acentos
- Labels curtos e específicos (ex: "AI Aplicada a Fintech", "Crédito Privado", "Exits e M&A")
- NUNCA use categorias genéricas como "Empreendedorismo" ou "Negócios" sem especificidade
- Os pesos somam 1.0`,
        messages: [{ role: "user", content: `Meta: "${goalText}"\nMétricas atuais: ${JSON.stringify(currentMetrics || {})}` }],
      });

      const text = concatText(msg.content as unknown[]);
      try {
        return NextResponse.json({ plan: parseJson(text) });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 422 });
      }
    }

    // ─── 2. ANALYZE TIMING (Haiku — mínimo) ───
    if (action === "analyze_timing") {
      const client = getAnthropic();
      if (!client) return noKey();

      const { goal } = body;

      const msg = await client.messages.create({
        model: MODEL_LIGHT,
        max_tokens: 500,
        system: `Você é especialista em distribuição de conteúdo no LinkedIn e Instagram para o mercado brasileiro de tech/fintech/investimentos.
Retorne APENAS JSON sem markdown:
{
  "linkedin": {
    "best_days": ["Terça","Quarta","Quinta"],
    "best_times": ["08:00","12:00","18:00"],
    "avoid": ["Segunda de manhã","Sexta à tarde","Fim de semana"],
    "rationale": "explicação em 1 frase"
  },
  "instagram": {
    "best_days": ["Terça","Quarta","Quinta"],
    "best_times": ["12:00","19:00"],
    "avoid": [],
    "rationale": "explicação em 1 frase"
  },
  "twitter": {
    "best_days": ["Segunda","Terça","Quarta","Quinta","Sexta"],
    "best_times": ["08:00","12:00","18:00","21:00"],
    "avoid": [],
    "rationale": "explicação em 1 frase"
  }
}`,
        messages: [{ role: "user", content: `Meta: ${goal?.interpreted_goal || "Crescer no LinkedIn"}\nCanais: ${Object.keys(goal?.content_mix || { linkedin: true }).join(", ")}` }],
      });

      const text = concatText(msg.content as unknown[]);
      try {
        return NextResponse.json({ timing: parseJson(text) });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 422 });
      }
    }

    // ─── 3. GENERATE THEMES — 3 por semana (Haiku + web search opcional) ───
    if (action === "generate_themes") {
      const client = getAnthropic();
      if (!client) return noKey();

      const { goal, timing, voiceProfile, week, month, year } = body;
      const weekNum = Number(week) || 1;

      // Quick web search for current trends
      let trendContext = "";
      try {
        const searchMsg = await (client.messages.create as any)({
          model: MODEL_LIGHT,
          max_tokens: 600,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Busque em 1 pesquisa: principais notícias e tendências desta semana em AI aplicada a negócios, fintechs brasileiras e ativos alternativos. Seja conciso.`,
          }],
        });
        trendContext = searchMsg.content
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n")
          .slice(0, 800);
      } catch {
        trendContext = "Pesquisa indisponível — use contexto geral do mercado.";
      }

      const skillsBlock = voiceProfile?.skills?.length
        ? `\nSkills: ${voiceProfile.skills.map((s: any) => s.name).join(", ")}`
        : "";

      const pillarsBlock = goal?.pillars?.length
        ? goal.pillars.map((p: any) => `- ${p.key}: ${p.label} (peso ${Math.round(p.weight * 100)}%)`).join("\n")
        : "- ai_business: AI + Negócios\n- alternative_assets: Ativos Alternativos\n- entrepreneurship: Empreendedorismo";

      const msg = await client.messages.create({
        model: MODEL_LIGHT,
        max_tokens: 1400,
        system: `Você gera exatamente 3 temas de conteúdo para a Semana ${weekNum} do mês ${month}/${year}.
Meta estratégica: ${goal?.interpreted_goal || "Crescer presença digital"}
Pilares disponíveis (use os keys exatos no campo "pillar"):
${pillarsBlock}${skillsBlock}

Tendências da semana:
${trendContext}

REGRAS:
- Exatamente 3 temas diferentes (1 por pilar preferencialmente)
- Cada tema deve ter ângulo específico e prático, não genérico
- Atribuir canal, formato e melhor data/horário baseado no timing fornecido
- Formato pode ser: post, carousel, thread, reel, story

Retorne APENAS JSON sem markdown:
{
  "week": ${weekNum},
  "themes": [
    {
      "id": "w${weekNum}_1",
      "theme": "título curto e direto",
      "angle": "ângulo específico — o que torna esse tema único e relevante agora",
      "briefing": "o que abordar em 2-3 frases: ponto central, dado ou história de apoio, fechamento",
      "channel": "linkedin",
      "format": "post",
      "pillar": "ai_business",
      "suggested_date": "YYYY-MM-DD",
      "suggested_time": "HH:MM",
      "visual_type": "none|image|video|carousel",
      "priority": "high|medium"
    }
  ]
}`,
        messages: [{ role: "user", content: `Gere os 3 temas para Semana ${weekNum}. Timing aprovado: ${JSON.stringify(timing || {})}` }],
      });

      const text = concatText(msg.content as unknown[]);
      try {
        const result = parseJson(text);
        return NextResponse.json({ ...result, trendContext });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 422 });
      }
    }

    // ─── 4. PRODUCE CONTENT — para um tema aprovado (Sonnet) ───
    if (action === "produce_content") {
      const client = getAnthropic();
      if (!client) return noKey();

      const { theme, angle, briefing, channel, format, voiceProfile, goal } = body;

      const voiceBlock = [
        voiceProfile?.rules?.length ? `Regras de voz: ${voiceProfile.rules.slice(0, 5).join("; ")}` : "",
        voiceProfile?.anti_patterns?.length ? `Nunca use: ${voiceProfile.anti_patterns.slice(0, 5).join("; ")}` : "",
        voiceProfile?.vocabulary?.length ? `Vocabulário: ${voiceProfile.vocabulary.slice(0, 10).join(", ")}` : "",
      ].filter(Boolean).join("\n");

      const goldExamples = (voiceProfile?.examples || [])
        .filter((e: any) => e.rating >= 4).slice(-2);
      const examplesBlock = goldExamples.length
        ? `\nExemplos gold:\n${goldExamples.map((e: any) => `---\n${e.text.slice(0, 300)}\n---`).join("\n")}`
        : "";

      const skillsBlock = voiceProfile?.skills?.length
        ? `\n\nHabilidades do agente:\n${voiceProfile.skills.map((s: any) => `[${s.name}] ${s.instructions.slice(0, 200)}`).join("\n")}`
        : "";

      const formatGuide: Record<string, string> = {
        post: "Texto corrido. LinkedIn: 800-1500 chars, abra com hook forte. Twitter: max 280. Instagram: 150-300 palavras + CTA no final.",
        carousel: "Carrossel. Slide 1: hook (max 8 palavras). Slides 2-7: 1 ideia por slide, headline curta + corpo. Último: CTA sutil. Separe slides com '---SLIDE---'.",
        thread: "Thread 4-5 tweets numerados. Max 280 chars cada. Tweet 1 funciona solo. Formato: 1/N",
        reel: "Script 15-30s. Hook nos 3 primeiros segundos. [text overlay] entre colchetes. Cenas claras.",
        story: "3 frases max. Impacto imediato. Sugestão de enquete ou CTA no final.",
      };

      const visualTypeMap: Record<string, string> = {
        post: channel === "instagram" ? "image" : "none",
        carousel: "carousel",
        thread: "none",
        reel: "video",
        story: "image",
      };

      const msg = await client.messages.create({
        model: MODEL_HEAVY,
        max_tokens: 1500,
        system: `Você é ghostwriter do Eric Bueno. Escreva COMO ERIC, em primeira pessoa.
Eric: empreendedor, sócio de fintech (Trigo Dourado), investidor, advisor tech. Fez exit.
Tom: técnico mas humano. Direto. Confiante. Nerd orgulhoso. NUNCA guru/coach/influencer.
${voiceBlock}${examplesBlock}${skillsBlock}

Meta: ${goal?.interpreted_goal || "Crescer presença digital"}
Canal: ${channel} | Formato: ${format}
${formatGuide[format] || formatGuide.post}

Responda APENAS JSON sem markdown:
{
  "content": "texto completo do post/script/thread",
  "style_notes": "instruções de postagem: emojis (se houver), formatação, melhor horário",
  "visual_prompt": "prompt detalhado em inglês para gerar imagem/vídeo — cena, estilo, paleta, mood. Escreva 'N/A' se não precisar.",
  "visual_type": "${visualTypeMap[format] || "none"}"
}`,
        messages: [{
          role: "user",
          content: `Tema: ${theme}\nÂngulo: ${angle || briefing}\nBriefing: ${briefing}\nCanal: ${channel} | Formato: ${format}`,
        }],
      });

      const raw = concatText(msg.content as unknown[]);
      let result: Record<string, unknown>;
      try {
        result = parseJson(raw);
      } catch {
        result = { content: raw, style_notes: "", visual_prompt: "", visual_type: visualTypeMap[format] || "none" };
      }

      return NextResponse.json({ ...result, format, channel });
    }

    // ─── 5. PROGRESS REPORT (Haiku) ───
    if (action === "progress_report") {
      const client = getAnthropic();
      if (!client) return noKey();

      const { goal, publishedPosts, metrics, weekNumber } = body;

      const msg = await client.messages.create({
        model: MODEL_LIGHT,
        max_tokens: 800,
        system: `Analista de performance do Eric. Compare publicações com a meta. Retorne JSON sem markdown:
{
  "summary": "3 frases sobre o progresso",
  "goal_progress": [{ "kpi": "nome", "target": 0, "current": 0, "pct": 0, "on_track": true }],
  "what_worked": ["insight 1"],
  "what_to_adjust": ["ajuste 1"],
  "next_week_focus": "onde focar",
  "confidence_score": 0.7
}`,
        messages: [{
          role: "user",
          content: `Meta: ${JSON.stringify(goal)}\nSemana: ${weekNumber}\nPosts: ${JSON.stringify((publishedPosts || []).slice(0, 10))}\nMétricas: ${JSON.stringify(metrics || {})}`,
        }],
      });

      const text = concatText(msg.content as unknown[]);
      let report: Record<string, unknown>;
      try { report = parseJson(text); } catch { report = { summary: text }; }
      return NextResponse.json({ report });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Agent error:", error);
    return NextResponse.json({ error: error.message || "Agent failed" }, { status: 500 });
  }
}
