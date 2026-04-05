import { NextRequest, NextResponse } from "next/server";

// Universal LLM router — calls the configured provider for each task
// Frontend sends: { task, modelId, providerId, apiKey?, params }
// This route handles the provider-specific API calls

interface RouteRequest {
  task: string;
  modelId: string;
  providerId: string;
  apiKey?: string; // from client localStorage, or falls back to env var
  params: {
    system?: string;
    prompt: string;
    maxTokens?: number;
    // Image-specific
    width?: number;
    height?: number;
    // Video-specific
    duration?: number;
    imageUrl?: string; // for image-to-video
  };
}

// --- PROVIDER HANDLERS ---

async function callAnthropic(modelId: string, apiKey: string, params: any) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: modelId,
    max_tokens: params.maxTokens || 1500,
    system: params.system || "",
    messages: [{ role: "user", content: params.prompt }],
  });

  return {
    type: "text",
    content: message.content[0].type === "text" ? message.content[0].text : "",
  };
}

async function callGoogle(modelId: string, apiKey: string, params: any) {
  // Gemini API for image generation (Nano Banana 2)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  const res = await fetch(`${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: params.prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["image", "text"],
        imageDimensions: {
          width: params.width || 1024,
          height: params.height || 1024,
        },
      },
    }),
  });

  const data = await res.json();

  // Extract image from response
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

  if (imagePart) {
    return {
      type: "image",
      content: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      mimeType: imagePart.inlineData.mimeType,
    };
  }

  // If no image, return text
  const textPart = parts.find((p: any) => p.text);
  return {
    type: "text",
    content: textPart?.text || "No output generated",
  };
}

async function callReplicate(modelId: string, apiKey: string, params: any) {
  // Create prediction
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: modelId,
      input: {
        prompt: params.prompt,
        width: params.width || 1200,
        height: params.height || 628,
        num_inference_steps: 25,
        guidance_scale: 3.5,
      },
    }),
  });

  const prediction = await res.json();

  // Poll for completion
  let result = prediction;
  let attempts = 0;
  while (result.status !== "succeeded" && result.status !== "failed" && attempts < 60) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${result.id}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    result = await pollRes.json();
    attempts++;
  }

  if (result.status === "failed") {
    throw new Error("Generation failed: " + (result.error || "unknown"));
  }

  const output = Array.isArray(result.output) ? result.output[0] : result.output;
  return { type: "image", content: output };
}

async function callOpenAI(modelId: string, apiKey: string, params: any) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      prompt: params.prompt,
      n: 1,
      size: `${params.width || 1024}x${params.height || 1024}`,
    }),
  });

  const data = await res.json();
  const url = data.data?.[0]?.url || data.data?.[0]?.b64_json;

  return { type: "image", content: url };
}

async function callRunway(modelId: string, apiKey: string, params: any) {
  const body: any = {
    model: modelId,
    duration: params.duration || 5,
  };

  if (params.imageUrl) {
    body.image = params.imageUrl;
    body.prompt = params.prompt;
  } else {
    body.prompt = params.prompt;
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

  // Poll for completion
  let result = task;
  let attempts = 0;
  while (result.status !== "SUCCEEDED" && result.status !== "FAILED" && attempts < 120) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(
      `https://api.dev.runwayml.com/v1/tasks/${result.id}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    result = await pollRes.json();
    attempts++;
  }

  if (result.status === "FAILED") {
    throw new Error("Video generation failed");
  }

  return { type: "video", content: result.output?.[0] || "" };
}

async function callLuma(modelId: string, apiKey: string, params: any) {
  const body: any = {
    prompt: params.prompt,
  };

  if (params.imageUrl) {
    body.keyframes = {
      frame0: { type: "image", url: params.imageUrl },
    };
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

  // Poll
  let result = task;
  let attempts = 0;
  while (result.state !== "completed" && result.state !== "failed" && attempts < 120) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(
      `https://api.lumalabs.ai/dream-machine/v1/generations/${result.id}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    result = await pollRes.json();
    attempts++;
  }

  return { type: "video", content: result.assets?.video || "" };
}

// --- MAIN HANDLER ---

const HANDLERS: Record<string, (modelId: string, apiKey: string, params: any) => Promise<any>> = {
  anthropic: callAnthropic,
  google: callGoogle,
  replicate: callReplicate,
  openai: callOpenAI,
  runway: callRunway,
  luma: callLuma,
};

// Environment variable fallbacks for API keys
const ENV_KEYS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_AI_API_KEY",
  replicate: "REPLICATE_API_TOKEN",
  openai: "OPENAI_API_KEY",
  runway: "RUNWAY_API_KEY",
  luma: "LUMA_API_KEY",
};

export async function POST(req: NextRequest) {
  try {
    const body: RouteRequest = await req.json();
    const { task, modelId, providerId, apiKey, params } = body;

    if (!providerId || !modelId || !params?.prompt) {
      return NextResponse.json(
        { error: "providerId, modelId, and params.prompt are required" },
        { status: 400 }
      );
    }

    // Resolve API key: client-provided > env var
    const resolvedKey = apiKey || process.env[ENV_KEYS[providerId] || ""] || "";
    if (!resolvedKey) {
      return NextResponse.json(
        {
          error: `No API key for ${providerId}. Configure in AI Config or set ${ENV_KEYS[providerId]} env var.`,
          needsKey: true,
          provider: providerId,
        },
        { status: 401 }
      );
    }

    const handler = HANDLERS[providerId];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown provider: ${providerId}` },
        { status: 400 }
      );
    }

    const result = await handler(modelId, resolvedKey, params);

    return NextResponse.json({
      task,
      modelId,
      providerId,
      result,
    });
  } catch (error: any) {
    console.error("LLM route error:", error);
    return NextResponse.json(
      { error: error.message || "LLM call failed" },
      { status: 500 }
    );
  }
}
