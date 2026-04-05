import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Generate image via Replicate (Flux Pro)
async function generateWithReplicate(prompt: string): Promise<string> {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "black-forest-labs/flux-1.1-pro",
      input: {
        prompt,
        width: 1200,
        height: 628, // LinkedIn optimal
        num_inference_steps: 25,
        guidance_scale: 3.5,
      },
    }),
  });

  const prediction = await res.json();

  // Poll for completion
  let result = prediction;
  while (result.status !== "succeeded" && result.status !== "failed") {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      {
        headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
      }
    );
    result = await pollRes.json();
  }

  if (result.status === "failed") {
    throw new Error("Image generation failed: " + (result.error || "unknown"));
  }

  // Flux returns a single URL or array
  const output = Array.isArray(result.output) ? result.output[0] : result.output;
  return output;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postBody, channel, customPrompt } = body;

    let imagePrompt = customPrompt;

    // If no custom prompt, use Claude to generate one from the post content
    if (!imagePrompt && postBody) {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: `Você gera prompts de imagem para posts de redes sociais do Eric Bueno (fintech, AI, investimentos).

Estilo visual desejado:
- Clean, editorial, profissional
- Paleta: tons escuros com acentos em azul, roxo ou verde
- Sem texto na imagem (o texto vai na legenda)
- Estilo fotográfico ou ilustração minimalista
- Evite: clipart, stock genérico, pessoas sorrindo forçado
- Formato: ${channel === "instagram" ? "quadrado 1:1" : "landscape 1.91:1 (LinkedIn/X)"}

Responda APENAS com o prompt em inglês para geração de imagem. Sem explicações.`,
        messages: [
          {
            role: "user",
            content: `Gere um prompt de imagem para acompanhar este post:\n\n${postBody}`,
          },
        ],
      });

      imagePrompt =
        message.content[0].type === "text" ? message.content[0].text : "";
    }

    if (!imagePrompt) {
      return NextResponse.json({ error: "No prompt generated" }, { status: 400 });
    }

    // Check if Replicate is configured
    if (!process.env.REPLICATE_API_TOKEN) {
      // Return the prompt without generating (for development)
      return NextResponse.json({
        prompt: imagePrompt,
        url: null,
        message: "REPLICATE_API_TOKEN not configured. Image prompt generated but not rendered.",
      });
    }

    const imageUrl = await generateWithReplicate(imagePrompt);

    return NextResponse.json({
      prompt: imagePrompt,
      url: imageUrl,
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error.message || "Image generation failed" },
      { status: 500 }
    );
  }
}
