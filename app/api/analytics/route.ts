import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contentWithMetrics, goals, voiceProfile } = body;

    if (!contentWithMetrics?.length) {
      return NextResponse.json({ error: "No data to analyze" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: `Você é o analista de performance de conteúdo do Eric Bueno.

Analise os dados de performance dos posts e gere insights acionáveis.

Contexto:
- Eric é empreendedor/investidor em fintech e ativos alternativos
- Pilares: AI + Negócios, Ativos Alternativos, Empreendedorismo
- Voice profile version: ${voiceProfile?.version || 0}
${goals?.length ? `- Objetivo ativo: ${JSON.stringify(goals.find((g: any) => g.status === "active"))}` : ""}

Responda em JSON (sem markdown):
{
  "summary": "resumo de 2-3 frases da performance geral",
  "top_performers": [
    { "id": "id_do_post", "reason": "por que performou bem" }
  ],
  "patterns": [
    { "pattern": "padrão identificado", "action": "o que fazer com isso" }
  ],
  "recommendations": [
    { "type": "content|timing|format|strategy", "suggestion": "sugestão específica" }
  ],
  "pillar_performance": {
    "ai_business": { "avg_engagement": 0, "trend": "up|down|stable" },
    "alternative_assets": { "avg_engagement": 0, "trend": "up|down|stable" },
    "entrepreneurship": { "avg_engagement": 0, "trend": "up|down|stable" }
  },
  "best_day": "dia da semana com melhor performance",
  "voice_suggestions": ["sugestões para refinar o tom de voz baseado no que funciona"]
}`,
      messages: [
        {
          role: "user",
          content: `Analise a performance destes posts:\n\n${JSON.stringify(contentWithMetrics, null, 2)}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = text.replace(/```json|```/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        summary: cleaned.slice(0, 200),
        patterns: [],
        recommendations: [],
        voice_suggestions: [],
      };
    }

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
