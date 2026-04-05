import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CarouselSlide {
  slideNumber: number;
  headline: string;
  body: string;
  accent?: string; // visual accent/emoji
  type: "cover" | "content" | "data" | "quote" | "cta";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { theme, pillar, numSlides = 7, voiceProfile } = body;

    const voiceContext = voiceProfile?.rules?.length
      ? `\nRegras de voz: ${voiceProfile.rules.join("; ")}`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `Você cria carrosséis para Instagram/LinkedIn do Eric Bueno.

QUEM É ERIC: Empreendedor, investidor, sócio de fintech de microcrédito. Fez exit. Advisor em tech e estratégia.

TOM: Técnico mas acessível. Direto. Confiante sem arrogância. Nerd orgulhoso.${voiceContext}

REGRAS DO CARROSSEL:
- Slide 1 (cover): headline provocativa que gera curiosidade. Máximo 8 palavras.
- Slides intermediários: 1 ideia por slide. Headline curta (3-6 palavras) + body (1-2 frases).
- Último slide (CTA): fechamento + convite sutil pra interação.
- Cada slide deve funcionar sozinho mas criar desejo de ver o próximo.
- Linguagem visual: use números, contrastes, perguntas retóricas.

Responda APENAS em JSON válido (sem markdown):
[
  {
    "slideNumber": 1,
    "headline": "Texto do headline",
    "body": "Texto do body (vazio no cover)",
    "accent": "emoji relevante",
    "type": "cover|content|data|quote|cta"
  }
]`,
      messages: [
        {
          role: "user",
          content: `Crie um carrossel de ${numSlides} slides sobre: ${theme}\n\nPilar: ${pillar}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "[]";
    const cleaned = text.replace(/```json|```/g, "").trim();

    let slides: CarouselSlide[] = [];
    try {
      slides = JSON.parse(cleaned);
    } catch {
      slides = [
        {
          slideNumber: 1,
          headline: "Erro ao gerar carrossel",
          body: cleaned.slice(0, 100),
          type: "cover",
        },
      ];
    }

    return NextResponse.json({ slides });
  } catch (error: any) {
    console.error("Carousel generation error:", error);
    return NextResponse.json(
      { error: error.message || "Carousel generation failed" },
      { status: 500 }
    );
  }
}
