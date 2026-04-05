import { NextRequest, NextResponse } from "next/server";

// Ayrshare API — unified social media posting
// Docs: https://docs.ayrshare.com
const AYRSHARE_API = "https://app.ayrshare.com/api";

interface PublishRequest {
  post: string;
  platforms: string[]; // ["instagram", "linkedin", "twitter"]
  mediaUrls?: string[];
  scheduledDate?: string; // ISO 8601
  title?: string; // LinkedIn article title
  isVideo?: boolean;
  carouselItems?: Array<{ url: string; caption?: string }>;
}

// POST: Publish or schedule a post
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      post,
      platforms,
      mediaUrls,
      scheduledDate,
      title,
      isVideo,
      carouselItems,
      postId, // for delete/analytics
    } = body;

    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "AYRSHARE_API_KEY não configurado. Adicione nas variáveis de ambiente.",
          needsConfig: true,
        },
        { status: 401 }
      );
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    // --- CHECK CONFIG ---
    if (action === "check") {
      try {
        const res = await fetch(`${AYRSHARE_API}/user`, { headers });
        const user = await res.json();
        return NextResponse.json({
          configured: true,
          activePlatforms: user.activeSocialAccounts || [],
          displayNames: user.displayNames || {},
        });
      } catch {
        return NextResponse.json({ configured: false });
      }
    }

    // --- GET CONNECTED PLATFORMS ---
    if (action === "platforms") {
      const res = await fetch(`${AYRSHARE_API}/user`, { headers });
      const user = await res.json();
      return NextResponse.json({
        platforms: user.activeSocialAccounts || [],
        displayNames: user.displayNames || {},
      });
    }

    // --- PUBLISH / SCHEDULE ---
    if (action === "publish" || action === "schedule") {
      if (!post || !platforms?.length) {
        return NextResponse.json({ error: "post and platforms are required" }, { status: 400 });
      }

      const payload: any = {
        post,
        platforms: platforms.map((p: string) => {
          if (p === "twitter") return "twitter";
          if (p === "linkedin") return "linkedin";
          if (p === "instagram") return "instagram";
          return p;
        }),
      };

      // Media attachments
      if (mediaUrls?.length) {
        payload.mediaUrls = mediaUrls;
      }

      // Carousel (Instagram)
      if (carouselItems?.length && platforms.includes("instagram")) {
        payload.isCarousel = true;
        payload.mediaUrls = carouselItems.map((item: any) => item.url);
      }

      // Video
      if (isVideo) {
        payload.isVideo = true;
      }

      // Schedule for later
      if (scheduledDate || action === "schedule") {
        payload.scheduleDate = scheduledDate;
      }

      // LinkedIn title
      if (title && platforms.includes("linkedin")) {
        payload.title = title;
      }

      const res = await fetch(`${AYRSHARE_API}/post`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.status === "error") {
        return NextResponse.json({ error: result.message || "Publish failed", details: result }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        id: result.id,
        postIds: result.postIds || {},
        status: result.status,
        scheduled: !!scheduledDate,
        scheduledDate: scheduledDate || null,
      });
    }

    // --- DELETE POST ---
    if (action === "delete" && postId) {
      const res = await fetch(`${AYRSHARE_API}/post`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ id: postId }),
      });
      const result = await res.json();
      return NextResponse.json(result);
    }

    // --- GET POST ANALYTICS ---
    if (action === "analytics" && postId) {
      const res = await fetch(`${AYRSHARE_API}/analytics/post`, {
        method: "POST",
        headers,
        body: JSON.stringify({ id: postId, platforms }),
      });
      const result = await res.json();
      return NextResponse.json({ analytics: result });
    }

    // --- GET HISTORY ---
    if (action === "history") {
      const res = await fetch(`${AYRSHARE_API}/history?lastDays=30`, { headers });
      const result = await res.json();
      return NextResponse.json({ posts: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Publish error:", error);
    return NextResponse.json({ error: error.message || "Publish failed" }, { status: 500 });
  }
}
