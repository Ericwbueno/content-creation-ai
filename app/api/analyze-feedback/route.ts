import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildFeedbackAnalysisPrompt } from "@/lib/voice-engine";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      original,
      edited,
      existingRules,
    }: {
      original: string;
      edited: string;
      existingRules: string[];
    } = body;

    if (!original || !edited) {
      return NextResponse.json(
        { error: "original and edited texts are required" },
        { status: 400 }
      );
    }

    const { system, user } = buildFeedbackAnalysisPrompt(
      original,
      edited,
      existingRules || []
    );

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: user }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    // Parse the JSON response
    const cleaned = text.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(cleaned);

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("Feedback analysis error:", error);
    return NextResponse.json(
      {
        analysis: {
          new_rules: [],
          anti_patterns: [],
          vocabulary: [],
          insight: "Não foi possível analisar o feedback.",
        },
      },
      { status: 200 } // Return 200 with empty analysis so the app doesn't break
    );
  }
}
