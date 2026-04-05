export interface ContentItem {
  id: string;
  created_at: string;
  scheduled_at?: string;
  channel: string;
  pillar: string;
  status:
    | "draft"
    | "pending_review"
    | "approved"
    | "published"
    | "rejected";
  body: string;
  original_body?: string;
  theme: string;
  rating?: number;
  feedback_note?: string;
  voice_version?: number;
  // Rich output fields
  style_notes?: string;
  visual_prompt?: string;
  visual_type?: "image" | "video" | "carousel" | "none";
}

export interface Theme {
  id: string;
  title: string;
  hook: string;
  pillar: string;
  source: string;
  source_url?: string;
  relevance: number;
  curated: boolean;
  used: boolean;
}
