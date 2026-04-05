import { NextRequest, NextResponse } from "next/server";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API = "https://api.linkedin.com";

function getBaseUrl(req: NextRequest): string {
  // Prefer explicit env var, fall back to request origin
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
  const redirectUri = `${baseUrl}/api/social/linkedin?action=callback`;

  if (action === "auth") {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: "openid profile email w_member_social",
    });
    return NextResponse.redirect(`${LINKEDIN_AUTH_URL}?${params}`);
  }

  if (action === "callback") {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}?linkedin_error=${encodeURIComponent(searchParams.get("error_description") || error)}`
      );
    }

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    try {
      const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: process.env.LINKEDIN_CLIENT_ID || "",
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
          redirect_uri: redirectUri,
        }),
      });

      const tokens = await tokenRes.json();

      if (tokens.error) {
        return NextResponse.redirect(
          `${baseUrl}?linkedin_error=${encodeURIComponent(tokens.error_description || tokens.error)}`
        );
      }

      const expiresAt = new Date(Date.now() + (tokens.expires_in || 5184000) * 1000).toISOString();

      return NextResponse.redirect(
        `${baseUrl}?` +
          new URLSearchParams({
            linkedin_token: tokens.access_token,
            linkedin_expires_at: expiresAt,
            ...(tokens.refresh_token ? { linkedin_refresh_token: tokens.refresh_token } : {}),
          })
      );
    } catch (error: any) {
      return NextResponse.redirect(
        `${baseUrl}?linkedin_error=${encodeURIComponent(error.message)}`
      );
    }
  }

  // Token refresh
  if (action === "refresh") {
    const refreshToken = searchParams.get("refresh_token");
    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 400 });
    }

    try {
      const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID || "",
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
        }),
      });
      const tokens = await tokenRes.json();

      if (tokens.error) {
        return NextResponse.json({ error: tokens.error_description, needsReauth: true }, { status: 401 });
      }

      return NextResponse.json({
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + (tokens.expires_in || 5184000) * 1000).toISOString(),
        refresh_token: tokens.refresh_token,
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (action === "check") {
    return NextResponse.json({
      configured: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, action: postAction } = body;

    if (!accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
      "LinkedIn-Version": "202402",
    };

    // --- GET PROFILE ---
    if (postAction === "profile") {
      const profileRes = await fetch(`${LINKEDIN_API}/v2/userinfo`, { headers });
      const profile = await profileRes.json();

      if (profile.serviceErrorCode) {
        return NextResponse.json(
          { error: profile.message, needsReauth: profile.status === 401 },
          { status: profile.status || 401 }
        );
      }

      return NextResponse.json({ profile });
    }

    // --- PUBLISH TEXT POST ---
    if (postAction === "publish") {
      const { personUrn, text, imageUrl } = body;

      if (!personUrn || !text) {
        return NextResponse.json({ error: "personUrn and text required" }, { status: 400 });
      }

      const postBody: any = {
        author: personUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      // If image, upload first
      if (imageUrl) {
        // Step 1: Register upload
        const registerRes = await fetch(`${LINKEDIN_API}/v2/assets?action=registerUpload`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
              owner: personUrn,
              serviceRelationships: [
                { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
              ],
            },
          }),
        });
        const registerData = await registerRes.json();

        const uploadUrl = registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
        const asset = registerData.value?.asset;

        if (uploadUrl && asset) {
          // Step 2: Download image and upload to LinkedIn
          const imageRes = await fetch(imageUrl);
          const imageBuffer = await imageRes.arrayBuffer();

          await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "image/jpeg",
            },
            body: imageBuffer,
          });

          // Add media to post
          postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [
            {
              status: "READY",
              media: asset,
            },
          ];
        }
      }

      const publishRes = await fetch(`${LINKEDIN_API}/v2/ugcPosts`, {
        method: "POST",
        headers,
        body: JSON.stringify(postBody),
      });

      if (!publishRes.ok) {
        const err = await publishRes.json();
        return NextResponse.json({ error: err.message || "Publish failed" }, { status: publishRes.status });
      }

      const postId = publishRes.headers.get("x-restli-id");
      return NextResponse.json({ success: true, postId });
    }

    // --- GET POST METRICS ---
    if (postAction === "post_metrics") {
      const { postUrn } = body;
      if (!postUrn) {
        return NextResponse.json({ error: "postUrn required" }, { status: 400 });
      }

      const metricsRes = await fetch(
        `${LINKEDIN_API}/v2/socialMetrics/${encodeURIComponent(postUrn)}`,
        { headers }
      );
      const metrics = await metricsRes.json();

      return NextResponse.json({
        metrics: {
          impressions: metrics.impressionCount || 0,
          likes: metrics.likeCount || 0,
          comments: metrics.commentCount || 0,
          shares: metrics.shareCount || 0,
          clicks: metrics.clickCount || 0,
          engagement_rate: metrics.impressionCount
            ? ((metrics.likeCount + metrics.commentCount + metrics.shareCount) / metrics.impressionCount) * 100
            : 0,
        },
      });
    }

    // --- GET RECENT POSTS ---
    if (postAction === "recent_posts") {
      const profileRes = await fetch(`${LINKEDIN_API}/v2/userinfo`, { headers });
      const profile = await profileRes.json();

      const postsRes = await fetch(
        `${LINKEDIN_API}/v2/ugcPosts?q=authors&authors=List(urn:li:person:${profile.sub})&count=20&sortBy=LAST_MODIFIED`,
        { headers }
      );
      const posts = await postsRes.json();

      return NextResponse.json({ posts: posts.elements || [] });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("LinkedIn API error:", error);
    return NextResponse.json({ error: error.message || "LinkedIn API failed" }, { status: 500 });
  }
}
