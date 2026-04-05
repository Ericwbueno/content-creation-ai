import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildGenerationPrompt, VoiceProfile, Goal } from "@/lib/voice-engine";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      theme,
      channels,
      voiceProfile,
      activeGoal,
    }: {
      theme: string;
      channels: string[];
      voiceProfile: VoiceProfile;
      activeGoal?: Goal;
    } = body;

    if (!theme || !channels?.length) {
      return NextResponse.json(
        { error: "theme and channels are required" },
        { status: 400 }
      );
    }

    // Generate for each channel in parallel
    const results: Record<string, string> = {};

    await Promise.all(
      channels.map(async (channel) => {
        const { system, user } = buildGenerationPrompt(
          theme,
          channel,
          voiceProfile,
          activeGoal
        );

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system,
          messages: [{ role: "user", content: user }],
        });

        const text =
          message.content[0].type === "text" ? message.content[0].text : "";
        results[channel] = text;
      })
    );

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error.message || "Generation failed" },
      { status: 500 }
    );
  }
}
