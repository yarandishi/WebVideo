/**
 * In-memory store of currently-active viewer sessions.
 * A session is "active" if it has sent a heartbeat within `ACTIVE_TIMEOUT_MS`.
 * (Ephemeral by design — resets on server restart, which is fine for
 *  "who is online right now".)
 */

export interface ViewerSession {
  /** stable per-browser id (from the `sid` cookie) */
  sid: string;
  ip: string;
  ua: string;
  /** current video slug the viewer is watching, if any */
  videoSlug: string | null;
  videoName: string | null;
  firstSeen: number;
  lastSeen: number;
}

/** A viewer is considered online if a heartbeat arrived within this window. */
export const ACTIVE_TIMEOUT_MS = 60_000;

const sessions = new Map<string, ViewerSession>();

/** Read the viewer's IP from proxy headers (set by the gateway) or the socket. */
export function getClientIp(request: Request): string {
  const h = request.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xreal = h.get("x-real-ip");
  if (xreal) return xreal.trim();
  return "unknown";
}

/** Create or update a session. */
export function touchSession(opts: {
  sid: string;
  ip: string;
  ua: string;
  videoSlug?: string | null;
  videoName?: string | null;
}): ViewerSession {
  const now = Date.now();
  const existing = sessions.get(opts.sid);
  const rec: ViewerSession = {
    sid: opts.sid,
    ip: opts.ip,
    ua: opts.ua,
    videoSlug: opts.videoSlug ?? existing?.videoSlug ?? null,
    videoName: opts.videoName ?? existing?.videoName ?? null,
    firstSeen: existing?.firstSeen ?? now,
    lastSeen: now,
  };
  sessions.set(opts.sid, rec);
  return rec;
}

/** Drop sessions older than `maxAge`. Called opportunistically. */
export function cleanupStaleSessions(maxAge = ACTIVE_TIMEOUT_MS * 3): void {
  const now = Date.now();
  for (const [sid, s] of sessions) {
    if (now - s.lastSeen > maxAge) sessions.delete(sid);
  }
}

/** Return currently-active sessions (newest first). */
export function getActiveSessions(timeoutMs = ACTIVE_TIMEOUT_MS): ViewerSession[] {
  cleanupStaleSessions();
  const now = Date.now();
  const out: ViewerSession[] = [];
  for (const s of sessions.values()) {
    if (now - s.lastSeen < timeoutMs) out.push(s);
  }
  return out.sort((a, b) => b.lastSeen - a.lastSeen);
}
