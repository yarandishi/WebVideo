import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getClientIp, touchSession } from "@/lib/sessions";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "vl_sid";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function parseCookies(request: Request): Record<string, string> {
  const raw = request.headers.get("cookie") ?? "";
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k.trim()] = decodeURIComponent((v ?? []).join("="));
  }
  return out;
}

function buildSidCookie(value: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax; HttpOnly${secure}`;
}

export async function POST(request: Request) {
  const cookies = parseCookies(request);
  let sid = cookies[COOKIE_NAME];
  const setCookie = !sid;
  if (!sid) sid = randomBytes(16).toString("hex");

  let body: { videoSlug?: string | null; videoName?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";

  touchSession({
    sid,
    ip,
    ua,
    videoSlug: body.videoSlug ?? null,
    videoName: body.videoName ?? null,
  });

  const res = NextResponse.json({ ok: true });
  if (setCookie) res.headers.set("set-cookie", buildSidCookie(sid));
  return res;
}
