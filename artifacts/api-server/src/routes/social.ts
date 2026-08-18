import { Router, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db, socialAccountsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
const GRAPH_VERSION = "v25.0";
const FACEBOOK_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "pages_manage_posts",
];

function secretKey() {
  return createHash("sha256").update(process.env.SESSION_SECRET ?? "development-session-secret").digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function signState(payload: string) {
  return `${payload}.${createHmac("sha256", secretKey()).update(payload).digest("base64url")}`;
}

function verifyState(value: string) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secretKey()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId: string; returnTo: string; expiresAt: number };
    return decoded.expiresAt > Date.now() ? decoded : null;
  } catch {
    return null;
  }
}

function publicOrigin(req: Request) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "https").split(",")[0];
  const forwardedHost = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "").split(",")[0];
  if (!forwardedHost) throw new Error("Unable to determine the public callback host");
  return `${forwardedProto}://${forwardedHost}`;
}

router.get("/facebook/start", requireAuth, (req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    res.status(503).json({ error: "Facebook App ID is not configured." });
    return;
  }
  const returnTo = typeof req.query.returnTo === "string" && req.query.returnTo.startsWith("/") ? req.query.returnTo : "/mes-reseaux";
  const statePayload = Buffer.from(JSON.stringify({
    userId: (req as any).userId as string,
    returnTo,
    expiresAt: Date.now() + 10 * 60 * 1000,
  })).toString("base64url");
  const state = signState(statePayload);
  const redirectUri = `${publicOrigin(req)}/api/social/facebook/callback`;
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", FACEBOOK_SCOPES.join(","));
  res.json({ url: url.toString(), redirectUri, scopes: FACEBOOK_SCOPES });
});

router.get("/facebook/callback", async (req, res) => {
  const state = typeof req.query.state === "string" ? verifyState(req.query.state) : null;
  const returnTo = state?.returnTo ?? "/mes-reseaux";
  if (!state) {
    res.redirect(`/mes-reseaux?facebook=error&reason=invalid_state`);
    return;
  }
  const code = typeof req.query.code === "string" ? req.query.code : null;
  if (!code) {
    res.redirect(`${returnTo}?facebook=error&reason=authorization_denied`);
    return;
  }
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    res.redirect(`${returnTo}?facebook=error&reason=facebook_credentials_missing`);
    return;
  }
  try {
    const redirectUri = `${publicOrigin(req)}/api/social/facebook/callback`;
    const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl);
    const tokenPayload = await tokenResponse.json() as { access_token?: string; expires_in?: number; error?: { message?: string } };
    if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error(tokenPayload.error?.message ?? "Facebook did not return an access token");
    const profileUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me`);
    profileUrl.searchParams.set("fields", "id,name");
    profileUrl.searchParams.set("access_token", tokenPayload.access_token);
    const profileResponse = await fetch(profileUrl);
    const profile = await profileResponse.json() as { id?: string; name?: string };
    await db.insert(socialAccountsTable).values({
      ownerId: state.userId,
      platform: "facebook",
      providerAccountId: profile.id ?? null,
      handle: profile.name ?? null,
      encryptedAccessToken: encrypt(tokenPayload.access_token),
      tokenExpiresAt: tokenPayload.expires_in ? new Date(Date.now() + tokenPayload.expires_in * 1000) : null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [socialAccountsTable.ownerId, socialAccountsTable.platform],
      set: {
        providerAccountId: profile.id ?? null,
        handle: profile.name ?? null,
        encryptedAccessToken: encrypt(tokenPayload.access_token),
        tokenExpiresAt: tokenPayload.expires_in ? new Date(Date.now() + tokenPayload.expires_in * 1000) : null,
        updatedAt: new Date(),
      },
    });
    res.redirect(`${returnTo}?facebook=connected`);
  } catch (error) {
    console.error("Facebook OAuth callback failed", error);
    res.redirect(`${returnTo}?facebook=error&reason=token_exchange_failed`);
  }
});

router.get("/facebook/status", requireAuth, async (req, res) => {
  const [account] = await db.select({
    id: socialAccountsTable.id,
    platform: socialAccountsTable.platform,
    providerAccountId: socialAccountsTable.providerAccountId,
    handle: socialAccountsTable.handle,
    tokenExpiresAt: socialAccountsTable.tokenExpiresAt,
  }).from(socialAccountsTable).where(and(eq(socialAccountsTable.ownerId, (req as any).userId), eq(socialAccountsTable.platform, "facebook"))).limit(1);
  res.json({ connected: Boolean(account), account: account ?? null });
});

export default router;