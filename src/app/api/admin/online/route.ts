import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getActiveSessions, ACTIVE_TIMEOUT_MS } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sessions = getActiveSessions(ACTIVE_TIMEOUT_MS);
  const now = Date.now();
  return NextResponse.json({
    online: sessions.length,
    sessions: sessions.map((s) => ({
      sid: s.sid.slice(0, 8),
      ip: s.ip,
      videoSlug: s.videoSlug,
      videoName: s.videoName,
      lastSeenAgo: Math.max(0, now - s.lastSeen),
      firstSeen: s.firstSeen,
    })),
  });
}
