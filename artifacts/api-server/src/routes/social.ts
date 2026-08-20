/**
 * Social media OAuth and stats routes.
 *
 * Supported platforms: facebook, instagram, tiktok
 *
 * Required environment variables:
 *   FACEBOOK_APP_ID      – Meta developer app ID (public value, non-secret)
 *   FACEBOOK_APP_SECRET  – Meta developer app secret (secret)
 *   TIKTOK_CLIENT_KEY    – TikTok developer client key (public value, non-secret)
 *   TIKTOK_CLIENT_SECRET – TikTok developer client secret (secret)
 *   SESSION_SECRET       – Used to sign OAuth state parameters
 */

import crypto from "crypto";
import { Router, type Request, type Response, type IRouter } from "express";
import { db, socialAccountsTable, type SocialAccount } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { decryptToken, encryptToken } from "../lib/socialCrypto";

const router: IRouter = Router();

type Platform = "facebook" | "instagram" | "tiktok";
const PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok"];
type OAuthClient = "web" | "mobile";

export class SocialSyncError extends Error {
  constructor(message: string, public readonly statusCode = 403) {
    super(message);
    this.name = "SocialSyncError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function owner(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? "";
}

/** Base URL used as OAuth redirect_uri. Uses the first REPLIT_DOMAINS entry in
 *  production; falls back to REPLIT_DEV_DOMAIN for local development. */
function apiBaseUrl(): string {
  const configured = process.env.SOCIAL_OAUTH_BASE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domains) return `https://${domains}`;
  const dev = process.env.REPLIT_DEV_DOMAIN;
  if (dev) return `https://${dev}`;
  return "http://localhost:3000";
}

function redirectUri(platform: Platform): string {
  // Use a static path: Meta's strict URI matching is less error-prone when
  // the registered callback has no query string.
  return `${apiBaseUrl()}/api/social/oauth/callback/${platform}`;
}

/** Sign a state token so callbacks cannot be forged. */
function signState(payload: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be configured for social OAuth");
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}|${hmac}`).toString("base64url");
}

function verifyState(state: string): { userId: string; platform: Platform; ts: number; client: OAuthClient } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString();
    const lastPipe = decoded.lastIndexOf("|");
    const payload = decoded.slice(0, lastPipe);
    const hmac = decoded.slice(lastPipe + 1);
    const secret = process.env.SESSION_SECRET;
    if (!secret) return null;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) return null;
    const [userId, platform, ts, client = "web"] = payload.split(":");
    if (!userId || !platform || !ts) return null;
    if (!PLATFORMS.includes(platform as Platform)) return null;
    if (client !== "web" && client !== "mobile") return null;
    // State expires in 10 minutes
    if (Date.now() - Number(ts) > 10 * 60 * 1000) return null;
    return { userId, platform: platform as Platform, ts: Number(ts), client: client as OAuthClient };
  } catch {
    return null;
  }
}

/** Generate a short unique id (not for security, just DB PK). */
function shortId(): string {
  return crypto.randomBytes(8).toString("hex");
}

function providerOauthUrl(platform: Platform, userId: string, client: OAuthClient = "web"): string {
  const state = signState(`${userId}:${platform}:${Date.now()}:${client}`);
  const callbackUri = redirectUri(platform);

  if (platform === "facebook" || platform === "instagram") {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) throw new Error("Facebook credentials not configured. Please set FACEBOOK_APP_ID.");
    const scope = platform === "instagram"
      ? "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_manage_insights,instagram_content_publish"
      : "pages_show_list,pages_read_engagement,pages_manage_posts,read_insights";
    const oauthUrl = new URL("https://www.facebook.com/v26.0/dialog/oauth");
    oauthUrl.searchParams.set("client_id", appId);
    oauthUrl.searchParams.set("redirect_uri", callbackUri);
    oauthUrl.searchParams.set("scope", scope);
    oauthUrl.searchParams.set("state", state);
    oauthUrl.searchParams.set("response_type", "code");
    return oauthUrl.toString();
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) throw new Error("TikTok credentials not configured. Please set TIKTOK_CLIENT_KEY.");
  const oauthUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  oauthUrl.searchParams.set("client_key", clientKey);
  oauthUrl.searchParams.set("redirect_uri", callbackUri);
  oauthUrl.searchParams.set("scope", "user.info.basic,user.info.stats,video.list,video.publish");
  oauthUrl.searchParams.set("state", state);
  oauthUrl.searchParams.set("response_type", "code");
  return oauthUrl.toString();
}

/** Exchange a short-lived Facebook user token for a 60-day long-lived token. */
async function facebookLongLivedToken(shortToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Facebook credentials not configured");

  const url = new URL("https://graph.facebook.com/v26.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url.toString());
  const json = await res.json() as { access_token?: string; expires_in?: number; error?: { message: string } };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message ?? "Failed to exchange Facebook token");
  }
  const expiresIn = json.expires_in ?? 5183944; // ~60 days default
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  return { accessToken: json.access_token, expiresAt };
}

/** Fetch Facebook Page info for the authenticated user. Returns the first page. */
async function fetchFacebookPage(accessToken: string): Promise<{ pageId: string; handle: string; pageToken: string } | null> {
  const url = `https://graph.facebook.com/v26.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`;
  const res = await fetch(url);
  const json = await res.json() as { data?: Array<{ id: string; name: string; access_token: string }> };
  const page = json.data?.[0];
  if (!page) return null;
  return { pageId: page.id, handle: page.name, pageToken: page.access_token };
}

/** Fetch Instagram Business account linked to a Facebook Page. */
async function fetchInstagramAccount(pageToken: string, pageId: string): Promise<{ igId: string; username: string } | null> {
  const url = `https://graph.facebook.com/v26.0/${pageId}?fields=instagram_business_account{id,username}&access_token=${pageToken}`;
  const res = await fetch(url);
  const json = await res.json() as { instagram_business_account?: { id: string; username: string } };
  const ig = json.instagram_business_account;
  if (!ig) return null;
  return { igId: ig.id, username: ig.username };
}

/** Fetch Facebook Page insights (followers, reach, posts). */
async function fetchFacebookStats(pageToken: string, pageId: string) {
  try {
    const since = Math.floor((Date.now() - 28 * 24 * 60 * 60 * 1000) / 1000);
    const metricUrl = `https://graph.facebook.com/v26.0/${pageId}/insights?metric=page_fans,page_impressions_unique&period=days_28&limit=1&access_token=${pageToken}`;
    const postsUrl = `https://graph.facebook.com/v26.0/${pageId}?fields=fan_count&access_token=${pageToken}`;
    const recentPostsUrl = `https://graph.facebook.com/v26.0/${pageId}/published_posts?fields=id,created_time,reactions.limit(0).summary(true),comments.limit(0).summary(true)&since=${since}&limit=100&access_token=${pageToken}`;

    const [metricsRes, pageRes, recentPostsRes] = await Promise.all([fetch(metricUrl), fetch(postsUrl), fetch(recentPostsUrl)]);
    const [metricsJson, pageJson, recentPostsJson] = await Promise.all([
      metricsRes.json() as Promise<{ data?: Array<{ name: string; values: Array<{ value: number }> }> }>,
      pageRes.json() as Promise<{ fan_count?: number }>,
      recentPostsRes.json() as Promise<{ data?: Array<{ reactions?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } } }> }>,
    ]);

    const reach = metricsJson.data?.find((m) => m.name === "page_impressions_unique")?.values?.[0]?.value ?? 0;
    const followers = pageJson.fan_count ?? 0;
    const posts = recentPostsJson.data ?? [];
    const interactions = posts.reduce((total, post) => total
      + (post.reactions?.summary?.total_count ?? 0)
      + (post.comments?.summary?.total_count ?? 0), 0);
    return { followers, reach, engagement: reach ? (interactions / reach) * 100 : 0, posts: posts.length, lastPost: "" };
  } catch (err) {
    logger.warn({ err }, "Failed to fetch Facebook stats");
    return null;
  }
}

/** Fetch Instagram Insights. */
async function fetchInstagramStats(pageToken: string, igId: string) {
  try {
    const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const url = `https://graph.facebook.com/v26.0/${igId}?fields=followers_count&access_token=${pageToken}`;
    const res = await fetch(url);
    const json = await res.json() as { followers_count?: number };

    const insightsUrl = `https://graph.facebook.com/v26.0/${igId}/insights?metric=reach&period=days_28&access_token=${pageToken}`;
    const mediaUrl = `https://graph.facebook.com/v26.0/${igId}/media?fields=id,timestamp,like_count,comments_count&limit=100&access_token=${pageToken}`;
    const [insRes, mediaRes] = await Promise.all([fetch(insightsUrl), fetch(mediaUrl)]);
    const [insJson, mediaJson] = await Promise.all([
      insRes.json() as Promise<{ data?: Array<{ name: string; values: Array<{ value: number }> }> }>,
      mediaRes.json() as Promise<{ data?: Array<{ timestamp?: string; like_count?: number; comments_count?: number }> }>,
    ]);

    const reachData = insJson.data?.find((m) => m.name === "reach")?.values ?? [];
    const reach = reachData.reduce((sum, v) => sum + v.value, 0);
    const posts = (mediaJson.data ?? []).filter((media) => media.timestamp && new Date(media.timestamp) >= since);
    const interactions = posts.reduce((sum, media) => sum + (media.like_count ?? 0) + (media.comments_count ?? 0), 0);

    return {
      followers: json.followers_count ?? 0,
      reach,
      engagement: reach ? (interactions / reach) * 100 : 0,
      posts: posts.length,
      lastPost: "",
    };
  } catch (err) {
    logger.warn({ err }, "Failed to fetch Instagram stats");
    return null;
  }
}

/** Renew a Meta user token and return the Page/Instagram credentials needed
 * for subsequent Graph requests. Page tokens are refreshed along with it. */
async function refreshMetaAccount(platform: "facebook" | "instagram", refreshToken: string) {
  const { accessToken: userToken, expiresAt } = await facebookLongLivedToken(refreshToken);
  const page = await fetchFacebookPage(userToken);
  if (!page) throw new Error("No linked Facebook Page found");
  if (platform === "facebook") {
    return {
      accessToken: page.pageToken,
      refreshToken: userToken,
      tokenExpiresAt: expiresAt,
      pageId: page.pageId,
      handle: page.handle,
    };
  }
  const instagram = await fetchInstagramAccount(page.pageToken, page.pageId);
  if (!instagram) throw new Error("No Instagram Business account linked to this Facebook Page");
  return {
    accessToken: page.pageToken,
    refreshToken: userToken,
    tokenExpiresAt: expiresAt,
    pageId: instagram.igId,
    handle: `@${instagram.username}`,
  };
}

/** Fetch TikTok user info and stats. */
async function fetchTikTokStats(accessToken: string) {
  try {
    const url = "https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count,likes_count,video_count";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json() as { data?: { user?: { display_name?: string; follower_count?: number } } };
    const user = json.data?.user;
    if (!user) return null;
    const videosRes = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,like_count,comment_count,share_count,view_count", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: 20 }),
    });
    const videosJson = await videosRes.json() as {
      data?: { videos?: Array<{ create_time?: number; like_count?: number; comment_count?: number; share_count?: number; view_count?: number }> };
    };
    const since = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const videos = (videosJson.data?.videos ?? []).filter((video) => (video.create_time ?? 0) * 1000 >= since);
    const reach = videos.reduce((sum, video) => sum + (video.view_count ?? 0), 0);
    const interactions = videos.reduce((sum, video) => sum + (video.like_count ?? 0) + (video.comment_count ?? 0) + (video.share_count ?? 0), 0);
    return {
      followers: user.follower_count ?? 0,
      reach,
      engagement: reach ? (interactions / reach) * 100 : 0,
      posts: videos.length,
      lastPost: "",
    };
  } catch (err) {
    logger.warn({ err }, "Failed to fetch TikTok stats");
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET /social/accounts — list connected accounts
// ---------------------------------------------------------------------------

router.get("/accounts", async (req: Request, res: Response): Promise<void> => {
  const userId = owner(req);
  const rows = await db.select().from(socialAccountsTable).where(eq(socialAccountsTable.ownerId, userId));
  res.json(rows.map((row) => ({
    platform: row.platform,
    handle: row.handle,
    pageId: row.pageId,
    status: row.status,
    statsCache: row.statsCache,
    statsUpdatedAt: row.statsUpdatedAt,
  })));
});

// ---------------------------------------------------------------------------
// GET /social/oauth/start — redirect to provider OAuth
// ---------------------------------------------------------------------------

router.get("/oauth/start", (req: Request, res: Response): void => {
  const platform = req.query.platform as string;
  const userId = owner(req);

  if (!PLATFORMS.includes(platform as Platform)) {
    res.status(400).json({ error: "Unsupported platform" });
    return;
  }

  try {
    res.redirect(providerOauthUrl(platform as Platform, userId));
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "OAuth provider is not configured" });
  }
});

// Native clients cannot pass their Clerk bearer session to an external browser.
// They request a signed provider URL first, then open that URL with Linking.
router.post("/oauth/start", (req: Request, res: Response): void => {
  const platform = req.body?.platform as string;
  if (!PLATFORMS.includes(platform as Platform)) {
    res.status(400).json({ error: "Unsupported platform" });
    return;
  }
  try {
    res.json({ url: providerOauthUrl(platform as Platform, owner(req), "mobile") });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "OAuth provider is not configured" });
  }
});

// ---------------------------------------------------------------------------
// GET /social/oauth/callback — handle provider callback
// ---------------------------------------------------------------------------

// NOTE: This route is hit without an authenticated session (the user just
// came back from a provider redirect). We verify identity via the signed state.
// Exported so index.ts can also mount it before the requireAuth middleware.
export async function oauthCallbackHandler(req: Request, res: Response): Promise<void> {
  // Accept the legacy query-string callback while using the static path for
  // every new OAuth authorization.
  const platform = (req.params.platform ?? req.query.platform) as string;
  const code = req.query.code as string;
  const state = req.query.state as string;
  const errorParam = req.query.error as string | undefined;

  // --- OAuth error from provider ---
  const stateData = state ? verifyState(state) : null;
  const clientRedirect = (params: string) => (
    stateData?.client === "mobile" ? `mobile://social-oauth?${params}` : `/mes-reseaux?${params}`
  );

  if (errorParam) {
    logger.warn({ platform, error: errorParam }, "OAuth error from provider");
    res.redirect(clientRedirect(`error=${encodeURIComponent(errorParam)}`));
    return;
  }

  if (!code || !state || !PLATFORMS.includes(platform as Platform)) {
    res.redirect("/mes-reseaux?error=invalid_callback");
    return;
  }

  if (!stateData) {
    res.redirect("/mes-reseaux?error=invalid_state");
    return;
  }
  if (stateData.platform !== platform) {
    logger.warn({ signedPlatform: stateData.platform, callbackPlatform: platform }, "OAuth callback platform did not match signed state");
    res.redirect(clientRedirect("error=invalid_state"));
    return;
  }

  const userId = stateData.userId;
  const callbackUri = redirectUri(platform as Platform);

  try {
    if (platform === "facebook" || platform === "instagram") {
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (!appId || !appSecret) throw new Error("Facebook credentials not configured");

      // Exchange code for short-lived token
      const tokenUrl = new URL("https://graph.facebook.com/v26.0/oauth/access_token");
      tokenUrl.searchParams.set("client_id", appId);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("redirect_uri", callbackUri);
      tokenUrl.searchParams.set("code", code);

      const tokenRes = await fetch(tokenUrl.toString());
      const tokenJson = await tokenRes.json() as { access_token?: string; error?: { message: string } };
      if (!tokenJson.access_token) throw new Error(tokenJson.error?.message ?? "Token exchange failed");

      // Upgrade to long-lived token (~60 days)
      const { accessToken, expiresAt } = await facebookLongLivedToken(tokenJson.access_token);

      // Get the Facebook Page linked to this user
      const page = await fetchFacebookPage(accessToken);

      if (platform === "facebook") {
        const handle = page?.handle ?? "Page Facebook";
        const pageToken = page?.pageToken ?? accessToken;
        const pageId = page?.pageId;

        const statsCache = page ? await fetchFacebookStats(pageToken, page.pageId) : null;

        await db.insert(socialAccountsTable)
          .values({
            id: shortId(),
            ownerId: userId,
            platform: "facebook",
            handle,
            pageId,
            accessToken: encryptToken(page?.pageToken ?? accessToken),
            refreshToken: encryptToken(accessToken),
            tokenExpiresAt: expiresAt,
            scopes: "pages_show_list,pages_read_engagement,pages_manage_posts,read_insights",
            status: "connected",
            statsCache,
            statsUpdatedAt: statsCache ? new Date() : null,
          })
          .onConflictDoUpdate({
            target: [socialAccountsTable.ownerId, socialAccountsTable.platform],
            set: {
              handle,
              pageId,
              accessToken: encryptToken(page?.pageToken ?? accessToken),
              refreshToken: encryptToken(accessToken),
              tokenExpiresAt: expiresAt,
              status: "connected",
              statsCache,
              statsUpdatedAt: statsCache ? new Date() : null,
              updatedAt: new Date(),
            },
          });

      } else {
        // Instagram — need the page token to access IG
        if (!page) throw new Error("No linked Facebook Page found — connect Facebook first");

        const ig = await fetchInstagramAccount(page.pageToken, page.pageId);
        if (!ig) throw new Error("No Instagram Business account linked to this Facebook Page");

        const statsCache = await fetchInstagramStats(page.pageToken, ig.igId);

        await db.insert(socialAccountsTable)
          .values({
            id: shortId(),
            ownerId: userId,
            platform: "instagram",
            handle: `@${ig.username}`,
            pageId: ig.igId,
            accessToken: encryptToken(page.pageToken), // use page token for IG Graph API calls
            refreshToken: encryptToken(accessToken),
            tokenExpiresAt: expiresAt,
            scopes: "instagram_basic,instagram_manage_insights,instagram_content_publish,pages_manage_posts",
            status: "connected",
            statsCache,
            statsUpdatedAt: statsCache ? new Date() : null,
          })
          .onConflictDoUpdate({
            target: [socialAccountsTable.ownerId, socialAccountsTable.platform],
            set: {
              handle: `@${ig.username}`,
              pageId: ig.igId,
              accessToken: encryptToken(page.pageToken),
              refreshToken: encryptToken(accessToken),
              tokenExpiresAt: expiresAt,
              status: "connected",
              statsCache,
              statsUpdatedAt: statsCache ? new Date() : null,
              updatedAt: new Date(),
            },
          });
      }

    } else if (platform === "tiktok") {
      const clientKey = process.env.TIKTOK_CLIENT_KEY;
      const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
      if (!clientKey || !clientSecret) throw new Error("TikTok credentials not configured");

      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: callbackUri,
        }),
      });

      const tokenJson = await tokenRes.json() as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        open_id?: string;
        error?: string;
        message?: string;
      };

      if (!tokenJson.access_token) {
        throw new Error(tokenJson.message ?? tokenJson.error ?? "TikTok token exchange failed");
      }

      const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 86400) * 1000);
      const statsCache = await fetchTikTokStats(tokenJson.access_token);

      // Fetch username
      const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      const userJson = await userRes.json() as { data?: { user?: { display_name?: string } } };
      const handle = userJson.data?.user?.display_name ?? "Compte TikTok";

      await db.insert(socialAccountsTable)
        .values({
          id: shortId(),
          ownerId: userId,
          platform: "tiktok",
          handle,
          pageId: tokenJson.open_id,
          accessToken: encryptToken(tokenJson.access_token),
          refreshToken: tokenJson.refresh_token ? encryptToken(tokenJson.refresh_token) : null,
          tokenExpiresAt: expiresAt,
          scopes: "user.info.basic,user.info.stats,video.list,video.publish",
          status: "connected",
          statsCache,
          statsUpdatedAt: statsCache ? new Date() : null,
        })
        .onConflictDoUpdate({
          target: [socialAccountsTable.ownerId, socialAccountsTable.platform],
          set: {
            handle,
            pageId: tokenJson.open_id,
            accessToken: encryptToken(tokenJson.access_token),
            refreshToken: tokenJson.refresh_token ? encryptToken(tokenJson.refresh_token) : null,
            tokenExpiresAt: expiresAt,
            status: "connected",
            statsCache,
            statsUpdatedAt: statsCache ? new Date() : null,
            updatedAt: new Date(),
          },
        });
    }

    res.redirect(clientRedirect(`connected=${platform}`));
  } catch (err) {
    logger.error({ err, platform, userId }, "OAuth callback error");
    const message = err instanceof Error ? err.message : "OAuth error";
    res.redirect(clientRedirect(`error=${encodeURIComponent(message)}`));
  }
}

router.get("/oauth/callback", oauthCallbackHandler);

// ---------------------------------------------------------------------------
// DELETE /social/accounts/:platform — disconnect
// ---------------------------------------------------------------------------

router.delete("/accounts/:platform", async (req: Request, res: Response): Promise<void> => {
  const userId = owner(req);
  const platform = req.params.platform as string;
  if (!PLATFORMS.includes(platform as Platform)) {
    res.status(400).json({ error: "Unsupported platform" });
    return;
  }
  await db.delete(socialAccountsTable).where(
    and(eq(socialAccountsTable.ownerId, userId), eq(socialAccountsTable.platform, platform))
  );
  res.json({ ok: true });
});

/**
 * Refresh one account's metrics. This is intentionally independent of an HTTP
 * request so scheduled refreshes and manual Sync buttons use the same code.
 *
 * A provider response of null is treated as a failed refresh: the existing
 * statsCache and statsUpdatedAt are left untouched.
 */
export async function refreshSocialAccountStats(account: SocialAccount): Promise<SocialAccount["statsCache"]> {
  const userId = account.ownerId;
  const platform = account.platform as Platform;

  // Decrypt only inside this server process. Tokens are re-encrypted before
  // any credential update and are never returned to a client.
  account.accessToken = decryptToken(account.accessToken);
  account.refreshToken = account.refreshToken ? decryptToken(account.refreshToken) : null;

  if (account.tokenExpiresAt && account.tokenExpiresAt <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
    if ((platform === "facebook" || platform === "instagram") && account.refreshToken) {
      try {
        const renewed = await refreshMetaAccount(platform, account.refreshToken);
        await db.update(socialAccountsTable)
          .set({
            ...renewed,
            accessToken: encryptToken(renewed.accessToken),
            refreshToken: encryptToken(renewed.refreshToken),
            status: "connected",
            updatedAt: new Date(),
          })
          .where(and(eq(socialAccountsTable.ownerId, userId), eq(socialAccountsTable.platform, platform)));
        account.accessToken = renewed.accessToken;
        account.refreshToken = renewed.refreshToken;
        account.tokenExpiresAt = renewed.tokenExpiresAt;
        account.pageId = renewed.pageId;
      } catch (error) {
        logger.warn({ error, platform, userId }, "Meta token refresh failed");
        await db.update(socialAccountsTable)
          .set({ status: "needs_reauth", updatedAt: new Date() })
          .where(and(eq(socialAccountsTable.ownerId, userId), eq(socialAccountsTable.platform, platform)));
        throw new SocialSyncError("Token expired — please reconnect");
      }
    } else if (platform !== "tiktok") {
      await db.update(socialAccountsTable)
        .set({ status: "needs_reauth", updatedAt: new Date() })
        .where(and(eq(socialAccountsTable.ownerId, userId), eq(socialAccountsTable.platform, platform)));
      throw new SocialSyncError("Token expired — please reconnect");
    }
  }

  let statsCache: SocialAccount["statsCache"] = null;
  try {
    if (platform === "facebook" && account.pageId) {
      statsCache = await fetchFacebookStats(account.accessToken, account.pageId);
    } else if (platform === "instagram" && account.pageId) {
      statsCache = await fetchInstagramStats(account.accessToken, account.pageId);
    } else if (platform === "tiktok") {
      const clientKey = process.env.TIKTOK_CLIENT_KEY;
      const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
      if (clientKey && clientSecret && account.refreshToken) {
        try {
          const refreshRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_key: clientKey,
              client_secret: clientSecret,
              grant_type: "refresh_token",
              refresh_token: account.refreshToken,
            }),
          });
          const refreshJson = await refreshRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
          if (!refreshRes.ok || !refreshJson.access_token) throw new Error("TikTok refresh token was rejected");
          const expiresAt = new Date(Date.now() + (refreshJson.expires_in ?? 86400) * 1000);
          await db.update(socialAccountsTable)
            .set({
              accessToken: encryptToken(refreshJson.access_token),
              refreshToken: encryptToken(refreshJson.refresh_token ?? account.refreshToken),
              tokenExpiresAt: expiresAt,
            })
            .where(and(eq(socialAccountsTable.ownerId, userId), eq(socialAccountsTable.platform, platform)));
          account.accessToken = refreshJson.access_token;
          account.refreshToken = refreshJson.refresh_token ?? account.refreshToken;
          account.tokenExpiresAt = expiresAt;
          statsCache = await fetchTikTokStats(refreshJson.access_token);
        } catch (error) {
          logger.warn({ error, platform, userId }, "TikTok token refresh failed");
          await db.update(socialAccountsTable)
            .set({ status: "needs_reauth", updatedAt: new Date() })
            .where(and(eq(socialAccountsTable.ownerId, userId), eq(socialAccountsTable.platform, platform)));
          throw new SocialSyncError("TikTok token is no longer valid — please reconnect");
        }
      } else {
        if (account.tokenExpiresAt && account.tokenExpiresAt <= new Date()) {
          await db.update(socialAccountsTable)
            .set({ status: "needs_reauth", updatedAt: new Date() })
            .where(and(eq(socialAccountsTable.ownerId, userId), eq(socialAccountsTable.platform, platform)));
          throw new SocialSyncError("TikTok token expired — please reconnect");
        }
        statsCache = await fetchTikTokStats(account.accessToken);
      }
    }
  } catch (error) {
    if (error instanceof SocialSyncError) throw error;
    logger.warn({ error, platform, userId }, "Stats sync failed");
  }

  if (statsCache) {
    await db.update(socialAccountsTable)
      .set({ statsCache, statsUpdatedAt: new Date(), status: "connected", updatedAt: new Date() })
      .where(and(eq(socialAccountsTable.ownerId, userId), eq(socialAccountsTable.platform, platform)));
  }
  return statsCache;
}

// ---------------------------------------------------------------------------
// POST /social/accounts/:platform/sync — refresh stats from the API
// ---------------------------------------------------------------------------

router.post("/accounts/:platform/sync", async (req: Request, res: Response): Promise<void> => {
  const userId = owner(req);
  const platform = req.params.platform as string;
  if (!PLATFORMS.includes(platform as Platform)) {
    res.status(400).json({ error: "Unsupported platform" });
    return;
  }

  const [account] = await db.select().from(socialAccountsTable).where(
    and(eq(socialAccountsTable.ownerId, userId), eq(socialAccountsTable.platform, platform))
  );

  if (!account) {
    res.status(404).json({ error: "Account not connected" });
    return;
  }

  try {
    const statsCache = await refreshSocialAccountStats(account);
    res.json({ ok: true, statsCache });
  } catch (error) {
    if (error instanceof SocialSyncError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    logger.error({ error, platform, userId }, "Manual social stats sync failed");
    res.status(500).json({ error: "Unable to sync social account" });
  }
});

export default router;
