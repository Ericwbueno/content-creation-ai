import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Provider handlers
async function generateWithRunway(prompt: string, imageUrl: string | null, duration: number, apiKey: string) {
  const body: any = {
    model: "gen3a_turbo",
    duration,
  };

  if (imageUrl) {
    body.promptImage = imageUrl;
    body.promptText = prompt;
  } else {
    body.promptText = prompt;
  }

  const res = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify(body),
  });

  const task = await res.json();
  if (task.error) throw new Error(task.error);

  // Poll for completion
  let result = task;
  let attempts = 0;
  while (result.status !== "SUCCEEDED" && result.status !== "FAILED" && attempts < 120) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${result.id}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
    });
    result = await pollRes.json();
    attempts++;
  }

  if (result.status === "FAILED") throw new Error("Video generation failed");
  return { url: result.output?.[0] || "", provider: "runway", duration };
}

async function generateWithLuma(prompt: string, imageUrl: string | null, apiKey: string) {
  const body: any = { prompt };

  if (imageUrl) {
    body.keyframes = { frame0: { type: "image", url: imageUrl } };
  }

  const res = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const task = await res.json();
  if (task.error) throw new Error(task.error);

  // Poll
  let result = task;
  let attempts = 0;
  while (result.state !== "completed" && result.state !== "failed" && attempts < 120) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${result.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    result = await pollRes.json();
    attempts++;
  }

  if (result.state === "failed") throw new Error("Video generation failed");
  return { url: result.assets?.video || "", provider: "luma" };
}

async function generateWithReplicate(prompt: string, imageUrl: string | null, apiKey: string) {
  // AnimateDiff for GIF-like short animations
  const input: any = { prompt, num_frames: 16, guidance_scale: 7.5 };
  if (imageUrl) input.init_image = imageUrl;

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "animatediff",
      input,
    }),
  });

  const prediction = await res.json();

  let result = prediction;
  let attempts = 0;
  while (result.status !== "succeeded" && result.status !== "failed" && attempts < 60) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    result = await pollRes.json();
    attempts++;
  }

  if (result.status === "failed") throw new Error("GIF generation failed");
  const output = Array.isArray(result.output) ? result.output[0] : result.output;
  return { url: output, provider: "replicate" };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      postBody,
      channel,
      imageUrl,
      customPrompt,
      provider = "runway", // runway | luma | replicate
      duration = 5,
      format = "video", // video | gif | reel
    } = body;

    // --- GENERATE VIDEO SCRIPT ---
    if (action === "script") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Você gera scripts de vídeo curto (5-15s) para o Eric Bueno.
Eric é empreendedor/investidor em fintech. Tom: técnico, direto, confiante.

Para Reels/Shorts: hook nos primeiros 2s, insight rápido, fechamento com provocação.
Para GIFs: descreva uma animação simples que complementa o post.

Responda em JSON (sem markdown):
{
  "script": "roteiro do vídeo com timecodes",
  "visual_prompt": "prompt em inglês para geração de vídeo com AI",
  "hook": "texto dos primeiros 2 segundos",
  "duration_seconds": 5,
  "format_suggestion": "reel|story|gif",
  "text_overlay": ["texto 1 para overlay", "texto 2"]
}`,
        messages: [
          {
            role: "user",
            content: `Crie um script de vídeo curto para este post (canal: ${channel}, formato: ${format}):\n\n${postBody}`,
          },
        ],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "{}";
      const cleaned = text.replace(/```json|```/g, "").trim();
      let script;
      try {
        script = JSON.parse(cleaned);
      } catch {
        script = { script: cleaned, visual_prompt: cleaned.slice(0, 200), duration_seconds: 5 };
      }

      return NextResponse.json({ script });
    }

    // --- GENERATE VIDEO PROMPT FROM POST ---
    if (action === "prompt") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: `Gere um prompt de vídeo curto (5-10s) em inglês para AI video generation.
Estilo: editorial, cinematic, clean. Sem texto na imagem.
Formato: ${format === "gif" ? "looping animation, seamless loop" : "short cinematic clip"}.
Responda APENAS com o prompt.`,
        messages: [
          {
            role: "user",
            content: `Prompt de vídeo para: ${postBody?.slice(0, 300)}`,
          },
        ],
      });

      const prompt = message.content[0].type === "text" ? message.content[0].text : "";
      return NextResponse.json({ prompt });
    }

    // --- GENERATE VIDEO ---
    if (action === "generate") {
      const videoPrompt = customPrompt || "Professional editorial motion graphics, clean minimal design, dark background with subtle light effects";

      // Resolve API key
      const providerKeys: Record<string, string> = {
        runway: process.env.RUNWAY_API_KEY || "",
        luma: process.env.LUMA_API_KEY || "",
        replicate: process.env.REPLICATE_API_TOKEN || "",
      };

      const apiKey = providerKeys[provider];
      if (!apiKey) {
        return NextResponse.json({
          error: `${provider.toUpperCase()} API key não configurada.`,
          prompt: videoPrompt,
          needsConfig: true,
        });
      }

      let result;
      switch (provider) {
        case "runway":
          result = await generateWithRunway(videoPrompt, imageUrl, duration, apiKey);
          break;
        case "luma":
          result = await generateWithLuma(videoPrompt, imageUrl, apiKey);
          break;
        case "replicate":
          result = await generateWithReplicate(videoPrompt, imageUrl, apiKey);
          break;
        default:
          return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        ...result,
        prompt: videoPrompt,
        format,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Video generation error:", error);
    return NextResponse.json({ error: error.message || "Video generation failed" }, { status: 500 });
  }
}
