import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pillars }: { pillars?: string[] } = body;

    const pillarContext = {
      ai_business: "AI aplicada a negócios, automação com LLMs, agentes de AI, infraestrutura de AI para operações",
      alternative_assets: "precatórios, FIDCs, consórcios, tokenização de ativos, crédito estruturado, ativos judiciais",
      entrepreneurship: "fintech, microcrédito, gestão, liderança, cultura de startup, exit, operação",
    };

    const selectedPillars = (pillars || Object.keys(pillarContext))
      .map((p) => pillarContext[p as keyof typeof pillarContext])
      .filter(Boolean)
      .join("; ");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        } as any,
      ],
      system: `Você é um pesquisador de conteúdo para o Eric Bueno, empreendedor e investidor em fintech e ativos alternativos.

Pesquise temas quentes e relevantes para posts de LinkedIn/X/Instagram nos seguintes temas: ${selectedPillars}

Retorne APENAS JSON válido (sem markdown, sem backticks) com 5-8 temas:
[
  {
    "title": "título curto do tema",
    "hook": "por que é relevante agora / gancho para post",
    "pillar": "ai_business|alternative_assets|entrepreneurship",
    "source": "de onde veio (nome da fonte)",
    "source_url": "URL se disponível",
    "relevance": 0.0-1.0
  }
]

Priorize: notícias da última semana, tendências emergentes, decisões regulatórias, cases reais, dados novos.`,
      messages: [
        {
          role: "user",
          content: "Pesquise os temas mais relevantes dessa semana para os pilares definidos.",
        },
      ],
    } as any);

    // Extract text from response (may have multiple content blocks due to tool use)
    const textBlocks = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as any).text)
      .join("\n");

    // Try to parse JSON from the response
    const cleaned = textBlocks.replace(/```json|```/g, "").trim();
    let themes = [];
    try {
      themes = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return raw text as single theme
      themes = [
        {
          title: "Pesquisa realizada",
          hook: cleaned.slice(0, 200),
          pillar: "ai_business",
          source: "web",
          relevance: 0.5,
        },
      ];
    }

    return NextResponse.json({ themes });
  } catch (error: any) {
    console.error("Research error:", error);
    return NextResponse.json(
      { error: error.message || "Research failed", themes: [] },
      { status: 500 }
    );
  }
}
