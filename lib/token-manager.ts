"use client";

// Social media token manager
// Handles localStorage persistence, expiry alerts, and auto-refresh

export interface TokenData {
  token: string;
  expiresAt: string; // ISO date
  refreshToken?: string;
  accountId?: string;
  username?: string;
}

const KEYS = {
  instagram: "ce-instagram-token-data",
  linkedin: "ce-linkedin-token-data",
};

// --- STORAGE ---

export function getTokenData(platform: "instagram" | "linkedin"): TokenData | null {
  try {
    const stored = localStorage.getItem(KEYS[platform]);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveTokenData(platform: "instagram" | "linkedin", data: TokenData): void {
  try {
    localStorage.setItem(KEYS[platform], JSON.stringify(data));
  } catch {}
}

export function clearTokenData(platform: "instagram" | "linkedin"): void {
  try {
    localStorage.removeItem(KEYS[platform]);
  } catch {}
}

// --- EXPIRY ---

export function isTokenExpired(data: TokenData | null): boolean {
  if (!data?.expiresAt) return true;
  return new Date(data.expiresAt) < new Date();
}

export function isTokenExpiringSoon(data: TokenData | null, daysThreshold = 7): boolean {
  if (!data?.expiresAt) return true;
  const expiresAt = new Date(data.expiresAt);
  const threshold = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000);
  return expiresAt < threshold;
}

export function daysUntilExpiry(data: TokenData | null): number {
  if (!data?.expiresAt) return 0;
  const diff = new Date(data.expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

// --- AUTO REFRESH ---

export async function refreshInstagramToken(data: TokenData): Promise<TokenData | null> {
  try {
    const res = await fetch(
      `/api/social/instagram?action=refresh&token=${encodeURIComponent(data.token)}`
    );
    const result = await res.json();

    if (result.needsReauth || result.error) {
      return null; // needs full re-authentication
    }

    const updated: TokenData = {
      ...data,
      token: result.access_token,
      expiresAt: result.expires_at,
    };
    saveTokenData("instagram", updated);
    return updated;
  } catch {
    return null;
  }
}

export async function refreshLinkedInToken(data: TokenData): Promise<TokenData | null> {
  if (!data.refreshToken) return null;

  try {
    const res = await fetch(
      `/api/social/linkedin?action=refresh&refresh_token=${encodeURIComponent(data.refreshToken)}`
    );
    const result = await res.json();

    if (result.needsReauth || result.error) {
      return null;
    }

    const updated: TokenData = {
      ...data,
      token: result.access_token,
      expiresAt: result.expires_at,
      refreshToken: result.refresh_token || data.refreshToken,
    };
    saveTokenData("linkedin", updated);
    return updated;
  } catch {
    return null;
  }
}

// --- URL PARAM CAPTURE ---
// Call this on app mount to capture OAuth redirect tokens

export function captureOAuthTokensFromURL(): {
  instagram?: TokenData;
  linkedin?: TokenData;
  errors: string[];
} {
  if (typeof window === "undefined") return { errors: [] };

  const params = new URLSearchParams(window.location.search);
  const errors: string[] = [];
  let instagram: TokenData | undefined;
  let linkedin: TokenData | undefined;

  // Instagram
  const igToken = params.get("instagram_token");
  const igExpiresAt = params.get("instagram_expires_at");
  const igError = params.get("instagram_error");

  if (igError) {
    errors.push(`Instagram: ${igError}`);
  } else if (igToken) {
    instagram = {
      token: igToken,
      expiresAt: igExpiresAt || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    };
    saveTokenData("instagram", instagram);
  }

  // LinkedIn
  const liToken = params.get("linkedin_token");
  const liExpiresAt = params.get("linkedin_expires_at");
  const liRefresh = params.get("linkedin_refresh_token");
  const liError = params.get("linkedin_error");

  if (liError) {
    errors.push(`LinkedIn: ${liError}`);
  } else if (liToken) {
    linkedin = {
      token: liToken,
      expiresAt: liExpiresAt || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      refreshToken: liRefresh || undefined,
    };
    saveTokenData("linkedin", linkedin);
  }

  // Clean URL
  if (igToken || liToken || igError || liError) {
    window.history.replaceState({}, "", window.location.pathname);
  }

  return { instagram, linkedin, errors };
}

// --- CHECK AND REFRESH ALL ---

export async function checkAndRefreshTokens(): Promise<{
  instagram: { status: "ok" | "expiring" | "expired" | "none"; daysLeft: number };
  linkedin: { status: "ok" | "expiring" | "expired" | "none"; daysLeft: number };
}> {
  const igData = getTokenData("instagram");
  const liData = getTokenData("linkedin");

  const result = {
    instagram: { status: "none" as any, daysLeft: 0 },
    linkedin: { status: "none" as any, daysLeft: 0 },
  };

  // Instagram
  if (igData) {
    if (isTokenExpired(igData)) {
      const refreshed = await refreshInstagramToken(igData);
      result.instagram = refreshed
        ? { status: "ok", daysLeft: daysUntilExpiry(refreshed) }
        : { status: "expired", daysLeft: 0 };
    } else if (isTokenExpiringSoon(igData)) {
      const refreshed = await refreshInstagramToken(igData);
      result.instagram = refreshed
        ? { status: "ok", daysLeft: daysUntilExpiry(refreshed) }
        : { status: "expiring", daysLeft: daysUntilExpiry(igData) };
    } else {
      result.instagram = { status: "ok", daysLeft: daysUntilExpiry(igData) };
    }
  }

  // LinkedIn
  if (liData) {
    if (isTokenExpired(liData)) {
      const refreshed = await refreshLinkedInToken(liData);
      result.linkedin = refreshed
        ? { status: "ok", daysLeft: daysUntilExpiry(refreshed) }
        : { status: "expired", daysLeft: 0 };
    } else if (isTokenExpiringSoon(liData)) {
      const refreshed = await refreshLinkedInToken(liData);
      result.linkedin = refreshed
        ? { status: "ok", daysLeft: daysUntilExpiry(refreshed) }
        : { status: "expiring", daysLeft: daysUntilExpiry(liData) };
    } else {
      result.linkedin = { status: "ok", daysLeft: daysUntilExpiry(liData) };
    }
  }

  return result;
}
