import crypto from "node:crypto";

/**
 * Offline, cookie-based admin auth.
 * Token = base64url(payload) + "." + base64url(hmac).
 * HMAC over payload using AUTH_SECRET (sha256).
 */

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "admin1234";
const AUTH_SECRET = process.env.AUTH_SECRET || "video-library-secret";

const COOKIE_NAME = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function b64url(input: string | Buffer): string {
  return Buffer.from(input as never).toString("base64url");
}

function sign(payloadStr: string): string {
  const hmac = crypto.createHmac("sha256", AUTH_SECRET).update(payloadStr).digest();
  return b64url(hmac);
}

function createToken(): string {
  const payload = JSON.stringify({ role: "admin", iat: Date.now() });
  const payloadB64 = b64url(payload);
  return `${payloadB64}.${sign(payloadB64)}`;
}

function verifyToken(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return false;
  // Recompute expected signature
  const expected = sign(payloadB64);
  if (expected.length !== sig.length) return false;
  // constant-time compare
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Parse a Cookie header into a name->value map. */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const pair of cookieHeader.split(/; */)) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    const val = pair.slice(eq + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

/** Build a Set-Cookie header value for a logged-in admin session. */
export function createSessionCookie(): string {
  const token = createToken();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

/** Build a Set-Cookie header value that clears the admin session. */
export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

/**
 * Verify the admin session on an incoming Request.
 * Returns `true` if admin, `false` otherwise.
 * (Throws nothing; never throws — it only returns a boolean.)
 */
export function requireAdmin(request: Request): boolean {
  try {
    const cookieHeader = request.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return false;
    return verifyToken(token);
  } catch {
    return false;
  }
}

/** Check the password (constant-time-ish). */
export function checkPassword(input: string): boolean {
  const a = Buffer.from(String(input));
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
