// LLM Router — routes tasks to the best model based on configuration
// Supports: Anthropic (Claude), Google (Gemini/Nano Banana), Replicate (Flux), Runway, OpenAI

export interface LLMProvider {
  id: string;
  name: string;
  type: "text" | "image" | "video";
  models: LLMModel[];
  authType: "api_key" | "oauth";
  docsUrl: string;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  costPer1k?: string; // approximate cost
  speed: "fast" | "medium" | "slow";
  quality: "standard" | "high" | "premium";
}

export interface TaskRoute {
  task: string;
  label: string;
  description: string;
  type: "text" | "image" | "video";
  defaultModel: string;
  configuredModel?: string;
}

// Available providers and models
export const PROVIDERS: LLMProvider[] = [
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    type: "text",
    authType: "api_key",
    docsUrl: "https://docs.anthropic.com",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic", capabilities: ["text-generation", "analysis", "voice-learning", "research"], costPer1k: "$0.003", speed: "fast", quality: "high" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", provider: "anthropic", capabilities: ["text-generation", "analysis", "voice-learning", "research", "complex-reasoning"], costPer1k: "$0.015", speed: "medium", quality: "premium" },
    ],
  },
  {
    id: "google",
    name: "Google (Gemini)",
    type: "image",
    authType: "api_key",
    docsUrl: "https://ai.google.dev",
    models: [
      { id: "gemini-3.1-flash-image", name: "Nano Banana 2", provider: "google", capabilities: ["image-generation", "text-in-image", "image-editing", "carousel-slides"], costPer1k: "$0.002", speed: "fast", quality: "high" },
      { id: "gemini-3.1-pro-image", name: "Nano Banana Pro", provider: "google", capabilities: ["image-generation", "text-in-image", "image-editing", "premium-quality"], costPer1k: "$0.01", speed: "medium", quality: "premium" },
    ],
  },
  {
    id: "replicate",
    name: "Replicate (Flux)",
    type: "image",
    authType: "api_key",
    docsUrl: "https://replicate.com/docs",
    models: [
      { id: "black-forest-labs/flux-1.1-pro", name: "Flux 1.1 Pro", provider: "replicate", capabilities: ["image-generation", "photorealistic", "editorial"], costPer1k: "$0.04", speed: "medium", quality: "premium" },
      { id: "black-forest-labs/flux-schnell", name: "Flux Schnell", provider: "replicate", capabilities: ["image-generation", "fast-draft"], costPer1k: "$0.003", speed: "fast", quality: "standard" },
      { id: "stability-ai/sdxl", name: "SDXL", provider: "replicate", capabilities: ["image-generation", "artistic"], costPer1k: "$0.01", speed: "medium", quality: "high" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    type: "image",
    authType: "api_key",
    docsUrl: "https://platform.openai.com/docs",
    models: [
      { id: "gpt-image-1", name: "GPT Image 1", provider: "openai", capabilities: ["image-generation", "text-in-image", "image-editing"], costPer1k: "$0.02", speed: "medium", quality: "high" },
    ],
  },
  {
    id: "runway",
    name: "Runway",
    type: "video",
    authType: "api_key",
    docsUrl: "https://docs.runwayml.com",
    models: [
      { id: "gen3a_turbo", name: "Gen-3 Alpha Turbo", provider: "runway", capabilities: ["text-to-video", "image-to-video", "fast"], costPer1k: "$0.50/s", speed: "fast", quality: "high" },
      { id: "gen3a", name: "Gen-3 Alpha", provider: "runway", capabilities: ["text-to-video", "image-to-video", "premium-quality"], costPer1k: "$1.00/s", speed: "slow", quality: "premium" },
    ],
  },
  {
    id: "luma",
    name: "Luma AI",
    type: "video",
    authType: "api_key",
    docsUrl: "https://docs.lumalabs.ai",
    models: [
      { id: "dream-machine", name: "Dream Machine", provider: "luma", capabilities: ["text-to-video", "image-to-video"], costPer1k: "$0.30/s", speed: "medium", quality: "high" },
    ],
  },
];

// Default task routing
export const DEFAULT_ROUTES: TaskRoute[] = [
  {
    task: "content_generation",
    label: "Geração de texto",
    description: "Posts para LinkedIn, X, Instagram",
    type: "text",
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    task: "voice_analysis",
    label: "Análise de voz",
    description: "Aprendizado de tom via feedback",
    type: "text",
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    task: "carousel_content",
    label: "Conteúdo de carrossel",
    description: "Texto dos slides do carrossel",
    type: "text",
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    task: "theme_research",
    label: "Pesquisa de temas",
    description: "Busca e curadoria de temas relevantes",
    type: "text",
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    task: "performance_analysis",
    label: "Análise de performance",
    description: "Insights sobre métricas e engajamento",
    type: "text",
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    task: "editorial_image",
    label: "Imagem editorial",
    description: "Fotos/visuais para posts de LinkedIn e X",
    type: "image",
    defaultModel: "black-forest-labs/flux-1.1-pro",
  },
  {
    task: "carousel_slides",
    label: "Slides de carrossel",
    description: "Imagens com texto para Instagram",
    type: "image",
    defaultModel: "gemini-3.1-flash-image",
  },
  {
    task: "social_cover",
    label: "Cover / Thumbnail",
    description: "Capas e thumbnails para vídeo/stories",
    type: "image",
    defaultModel: "gemini-3.1-flash-image",
  },
  {
    task: "short_video",
    label: "Vídeo curto",
    description: "Reels, shorts, animações de 3-10s",
    type: "video",
    defaultModel: "gen3a_turbo",
  },
  {
    task: "gif_animation",
    label: "GIF animado",
    description: "Animações curtas pra posts",
    type: "video",
    defaultModel: "gen3a_turbo",
  },
];

// Configuration type stored in localStorage/Supabase
export interface LLMConfig {
  apiKeys: Record<string, string>; // provider_id -> api_key
  routes: Record<string, string>; // task -> model_id
  preferences: {
    prioritize: "speed" | "quality" | "cost";
    autoFallback: boolean; // if configured model fails, try default
  };
}

export const DEFAULT_CONFIG: LLMConfig = {
  apiKeys: {},
  routes: {},
  preferences: {
    prioritize: "quality",
    autoFallback: true,
  },
};

// Get the model for a specific task
export function getModelForTask(
  task: string,
  config: LLMConfig
): { modelId: string; providerId: string; model: LLMModel | null } {
  const route = DEFAULT_ROUTES.find((r) => r.task === task);
  if (!route) {
    return { modelId: "", providerId: "", model: null };
  }

  const modelId = config.routes[task] || route.defaultModel;

  // Find the provider and model
  for (const provider of PROVIDERS) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) {
      return { modelId, providerId: provider.id, model };
    }
  }

  return { modelId, providerId: "", model: null };
}

// Check if a provider is configured (has API key)
export function isProviderConfigured(
  providerId: string,
  config: LLMConfig
): boolean {
  return !!config.apiKeys[providerId];
}

// Get all available models for a task type
export function getModelsForType(type: "text" | "image" | "video"): LLMModel[] {
  return PROVIDERS.filter((p) => p.type === type).flatMap((p) => p.models);
}
