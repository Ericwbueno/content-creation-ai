import { NextRequest, NextResponse } from "next/server";

const API_VERSION = "v25.0";
const FB_AUTH_URL = `https://www.facebook.com/${API_VERSION}/dialog/oauth`;
const FB_TOKEN_URL = `https://graph.facebook.com/${API_VERSION}/oauth/access_token`;
const GRAPH_API = `https://graph.facebook.com/${API_VERSION}`;
const PUBLISH_LIMIT_24H = 50;

function getBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/social/instagram?action=callback`;

  if (action === "auth") {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID || "",
      redirect_uri: redirectUri,
      scope: [
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_insights",
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
      ].join(","),
      response_type: "code",
    });
    return NextResponse.redirect(`${FB_AUTH_URL}?${params}`);
  }

  if (action === "callback") {
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "No authorization code received" }, { status: 400 });
    }

    try {
      const shortTokenRes = await fetch(
        `${FB_TOKEN_URL}?` +
          new URLSearchParams({
            client_id: process.env.FACEBOOK_APP_ID || "",
            client_secret: process.env.FACEBOOK_APP_SECRET || "",
            redirect_uri: redirectUri,
            code,
          })
      );
      const shortToken = await shortTokenRes.json();

      if (shortToken.error) {
        return NextResponse.redirect(
          `${baseUrl}?instagram_error=${encodeURIComponent(shortToken.error.message)}`
        );
      }

      const longTokenRes = await fetch(
        `${GRAPH_API}/oauth/access_token?` +
          new URLSearchParams({
            grant_type: "fb_exchange_token",
            client_id: process.env.FACEBOOK_APP_ID || "",
            client_secret: process.env.FACEBOOK_APP_SECRET || "",
            fb_exchange_token: shortToken.access_token,
          })
      );
      const longToken = await longTokenRes.json();

      if (longToken.error) {
        return NextResponse.redirect(
          `${baseUrl}?instagram_error=${encodeURIComponent(longToken.error.message)}`
        );
      }

      const expiresAt = new Date(
        Date.now() + (longToken.expires_in || 5184000) * 1000
      ).toISOString();

      return NextResponse.redirect(
        `${baseUrl}?` +
          new URLSearchParams({
            instagram_token: longToken.access_token,
            instagram_expires_at: expiresAt,
          })
      );
    } catch (error: any) {
      return NextResponse.redirect(
        `${baseUrl}?instagram_error=${encodeURIComponent(error.message)}`
      );
    }
  }

  if (action === "refresh") {
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "No token to refresh" }, { status: 400 });
    }

    try {
      const refreshRes = await fetch(
        `${GRAPH_API}/oauth/access_token?` +
          new URLSearchParams({
            grant_type: "fb_exchange_token",
            client_id: process.env.FACEBOOK_APP_ID || "",
            client_secret: process.env.FACEBOOK_APP_SECRET || "",
            fb_exchange_token: token,
          })
      );
      const refreshed = await refreshRes.json();

      if (refreshed.error) {
        return NextResponse.json(
          { error: refreshed.error.message, needsReauth: true },
          { status: 401 }
        );
      }

      return NextResponse.json({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + (refreshed.expires_in || 5184000) * 1000).toISOString(),
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (action === "check") {
    return NextResponse.json({
      configured: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, action: postAction } = body;

    if (!accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }

    if (postAction === "account") {
      const pagesRes = await fetch(`${GRAPH_API}/me/accounts?access_token=${accessToken}`);
      const pages = await pagesRes.json();

      if (pages.error) {
        return NextResponse.json(
          { error: pages.error.message, needsReauth: pages.error.code === 190 },
          { status: 401 }
        );
      }

      if (!pages.data?.length) {
        return NextResponse.json({ error: "No Facebook Pages found. Link a Page to your Instagram account." }, { status: 404 });
      }

      const pageId = pages.data[0].id;
      const pageToken = pages.data[0].access_token;
      const igRes = await fetch(`${GRAPH_API}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`);
      const ig = await igRes.json();

      if (!ig.instagram_business_account) {
        return NextResponse.json({ error: "No Instagram Business/Creator account linked to this Facebook Page." }, { status: 404 });
      }

      const igAccountId = ig.instagram_business_account.id;
      const accountRes = await fetch(`${GRAPH_API}/${igAccountId}?fields=username,followers_count,media_count,profile_picture_url&access_token=${accessToken}`);
      const account = await accountRes.json();

      return NextResponse.json({ account: { ...account, id: igAccountId }, pageToken });
    }

    if (postAction === "check_publish_limit") {
      const { igAccountId } = body;
      const limitRes = await fetch(`${GRAPH_API}/${igAccountId}/content_publishing_limit?fields=config,quota_usage&access_token=${accessToken}`);
      const limitData = await limitRes.json();
      const usage = limitData.data?.[0]?.quota_usage || 0;

      return NextResponse.json({ limit: PUBLISH_LIMIT_24H, usage, remaining: PUBLISH_LIMIT_24H - usage });
    }

    if (postAction === "publish") {
      const { igAccountId, imageUrl, caption, mediaType = "IMAGE" } = body;
      if (!igAccountId || !imageUrl) {
        return NextResponse.json({ error: "igAccountId and imageUrl required" }, { status: 400 });
      }

      const limitRes = await fetch(`${GRAPH_API}/${igAccountId}/content_publishing_limit?fields=quota_usage&access_token=${accessToken}`);
      const limitData = await limitRes.json();
      const currentUsage = limitData.data?.[0]?.quota_usage || 0;

      if (currentUsage >= PUBLISH_LIMIT_24H) {
        return NextResponse.json(
          { error: `Rate limit: ${currentUsage}/${PUBLISH_LIMIT_24H} posts nas últimas 24h.`, rateLimited: true },
          { status: 429 }
        );
      }

      const containerParams: Record<string, string> = { access_token: accessToken };

      if (mediaType === "REELS") {
        containerParams.media_type = "REELS";
        containerParams.video_url = imageUrl;
        if (caption) containerParams.caption = caption;
      } else {
        containerParams.image_url = imageUrl;
        if (caption) containerParams.caption = caption;
      }

      const containerRes = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerParams),
      });
      const container = await containerRes.json();

      if (container.error) {
        return NextResponse.json({ error: container.error.message }, { status: 400 });
      }

      if (mediaType === "REELS") {
        let status = "IN_PROGRESS";
        let attempts = 0;
        while (status === "IN_PROGRESS" && attempts < 60) {
          await new Promise((r) => setTimeout(r, 3000));
          const statusRes = await fetch(`${GRAPH_API}/${container.id}?fields=status_code&access_token=${accessToken}`);
          const statusData = await statusRes.json();
          status = statusData.status_code || "FINISHED";
          attempts++;
        }
        if (status === "ERROR") {
          return NextResponse.json({ error: "Media processing failed" }, { status: 500 });
        }
      }

      const publishRes = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
      });
      const published = await publishRes.json();

      if (published.error) {
        return NextResponse.json({ error: published.error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, mediaId: published.id, usage: currentUsage + 1, remaining: PUBLISH_LIMIT_24H - currentUsage - 1 });
    }

    if (postAction === "publish_carousel") {
      const { igAccountId, items, caption } = body;
      if (!igAccountId || !items?.length) {
        return NextResponse.json({ error: "igAccountId and items required" }, { status: 400 });
      }
      if (items.length > 10) {
        return NextResponse.json({ error: "Carousel limited to 10 items" }, { status: 400 });
      }

      const limitRes = await fetch(`${GRAPH_API}/${igAccountId}/content_publishing_limit?fields=quota_usage&access_token=${accessToken}`);
      const limitData = await limitRes.json();
      const currentUsage = limitData.data?.[0]?.quota_usage || 0;

      if (currentUsage >= PUBLISH_LIMIT_24H) {
        return NextResponse.json({ error: `Rate limit: ${currentUsage}/${PUBLISH_LIMIT_24H}`, rateLimited: true }, { status: 429 });
      }

      const childIds: string[] = [];
      for (const item of items) {
        const childRes = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: item.imageUrl, is_carousel_item: true, access_token: accessToken }),
        });
        const child = await childRes.json();
        if (child.error) {
          return NextResponse.json({ error: `Child error: ${child.error.message}` }, { status: 400 });
        }
        childIds.push(child.id);
      }

      const carouselRes = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_type: "CAROUSEL", children: childIds.join(","), caption: caption || "", access_token: accessToken }),
      });
      const carousel = await carouselRes.json();
      if (carousel.error) {
        return NextResponse.json({ error: carousel.error.message }, { status: 400 });
      }

      const publishRes = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: carousel.id, access_token: accessToken }),
      });
      const published = await publishRes.json();
      if (published.error) {
        return NextResponse.json({ error: published.error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, mediaId: published.id, usage: currentUsage + 1, remaining: PUBLISH_LIMIT_24H - currentUsage - 1 });
    }

    if (postAction === "recent_media") {
      const { igAccountId } = body;
      if (!igAccountId) {
        return NextResponse.json({ error: "No IG account ID" }, { status: 400 });
      }

      const mediaRes = await fetch(`${GRAPH_API}/${igAccountId}/media?fields=id,caption,timestamp,media_type,like_count,comments_count,permalink,thumbnail_url,media_url&limit=25&access_token=${accessToken}`);
      const media = await mediaRes.json();

      if (media.error) {
        return NextResponse.json({ error: media.error.message, needsReauth: media.error.code === 190 }, { status: media.error.code === 190 ? 401 : 400 });
      }

      const mediaWithInsights = await Promise.all(
        (media.data || []).map(async (m: any) => {
          try {
            const metrics = m.media_type === "VIDEO" || m.media_type === "REELS" ? "impressions,reach,saved,shares,plays" : "impressions,reach,saved,shares";
            const insightsRes = await fetch(`${GRAPH_API}/${m.id}/insights?metric=${metrics}&access_token=${accessToken}`);
            const insights = await insightsRes.json();
            const map: Record<string, number> = {};
            (insights.data || []).forEach((i: any) => { map[i.name] = i.values?.[0]?.value || 0; });

            return {
              ...m,
              insights: {
                impressions: map.impressions || 0, reach: map.reach || 0, saves: map.saved || 0,
                shares: map.shares || 0, plays: map.plays || 0, likes: m.like_count || 0,
                comments: m.comments_count || 0,
                engagement_rate: map.impressions ? (((m.like_count || 0) + (m.comments_count || 0) + (map.saved || 0)) / map.impressions) * 100 : 0,
              },
            };
          } catch { return { ...m, insights: null }; }
        })
      );

      return NextResponse.json({ media: mediaWithInsights });
    }

    if (postAction === "account_insights") {
      const { igAccountId, period = "day", since, until } = body;
      const params = new URLSearchParams({ metric: "impressions,reach,profile_views,follower_count", period, access_token: accessToken });
      if (since) params.set("since", since);
      if (until) params.set("until", until);

      const insightsRes = await fetch(`${GRAPH_API}/${igAccountId}/insights?${params}`);
      const insights = await insightsRes.json();
      return NextResponse.json({ insights: insights.data || [] });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Instagram API error:", error);
    return NextResponse.json({ error: error.message || "Instagram API failed" }, { status: 500 });
  }
}
