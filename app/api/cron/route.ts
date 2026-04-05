import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// This endpoint is called by Vercel Cron
// vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "*/15 * * * *" }] }

const AYRSHARE_API = "https://app.ayrshare.com/api";

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (Vercel sets this header)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const action = req.nextUrl.searchParams.get("action") || "publish";
    const supabase = createServerClient();
    const apiKey = process.env.AYRSHARE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "AYRSHARE_API_KEY not configured" }, { status: 500 });
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    // --- AUTO PUBLISH SCHEDULED POSTS ---
    if (action === "publish") {
      const now = new Date().toISOString();

      // Get approved posts that are scheduled for now or past
      const { data: duePosts, error } = await supabase
        .from("content")
        .select("*")
        .eq("status", "approved")
        .lte("scheduled_at", now)
        .is("published_at", null)
        .order("scheduled_at", { ascending: true })
        .limit(5); // Process max 5 per cron run

      if (error || !duePosts?.length) {
        return NextResponse.json({ message: "No posts to publish", count: 0 });
      }

      const results = [];

      for (const post of duePosts) {
        try {
          // Build publish payload
          const payload: any = {
            post: post.body,
            platforms: [post.channel],
          };

          if (post.visual_url) {
            payload.mediaUrls = [post.visual_url];
          }

          // Publish via Ayrshare
          const pubRes = await fetch(`${AYRSHARE_API}/post`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });
          const pubResult = await pubRes.json();

          if (pubResult.status === "error") {
            // Mark as failed but don't block others
            await supabase
              .from("content")
              .update({ status: "draft", feedback_note: `Auto-publish failed: ${pubResult.message}` })
              .eq("id", post.id);

            results.push({ id: post.id, success: false, error: pubResult.message });
            continue;
          }

          // Update post as published
          await supabase
            .from("content")
            .update({
              status: "published",
              published_at: now,
              ai_params: {
                ...((post.ai_params as any) || {}),
                ayrshare_id: pubResult.id,
                ayrshare_post_ids: pubResult.postIds,
              },
            })
            .eq("id", post.id);

          results.push({ id: post.id, success: true, ayrshareId: pubResult.id });
        } catch (err: any) {
          results.push({ id: post.id, success: false, error: err.message });
        }
      }

      return NextResponse.json({ message: "Cron publish complete", results, count: results.length });
    }

    // --- FETCH METRICS FOR PUBLISHED POSTS ---
    if (action === "metrics") {
      const { data: publishedPosts, error } = await supabase
        .from("content")
        .select("*")
        .eq("status", "published")
        .not("ai_params->ayrshare_id", "is", null)
        .order("published_at", { ascending: false })
        .limit(20);

      if (error || !publishedPosts?.length) {
        return NextResponse.json({ message: "No published posts to fetch metrics for", count: 0 });
      }

      const results = [];

      for (const post of publishedPosts) {
        try {
          const ayrshareId = (post.ai_params as any)?.ayrshare_id;
          if (!ayrshareId) continue;

          const analyticsRes = await fetch(`${AYRSHARE_API}/analytics/post`, {
            method: "POST",
            headers,
            body: JSON.stringify({ id: ayrshareId, platforms: [post.channel] }),
          });
          const analytics = await analyticsRes.json();

          // Map to our analytics format
          const channelData = analytics[post.channel] || analytics;
          const parsedMetricsData = {
            impressions: channelData.impressions || channelData.views || 0,
            likes: channelData.likes || channelData.reactions || 0,
            comments: channelData.comments || channelData.replies || 0,
            shares: channelData.shares || channelData.reposts || 0,
            saves: channelData.saves || channelData.bookmarks || 0,
            clicks: channelData.clicks || 0,
          };
          const metricsData = {
            ...parsedMetricsData,
            engagement_rate: parsedMetricsData.impressions > 0
              ? ((parsedMetricsData.likes + parsedMetricsData.comments + parsedMetricsData.shares) / parsedMetricsData.impressions) * 100
              : 0,
          };

          // Upsert analytics
          await supabase.from("analytics").upsert(
            {
              content_id: post.id,
              channel: post.channel,
              ...metricsData,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "content_id" }
          );

          results.push({ id: post.id, metrics: metricsData });
        } catch (err: any) {
          results.push({ id: post.id, error: err.message });
        }
      }

      return NextResponse.json({ message: "Metrics fetch complete", results, count: results.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
