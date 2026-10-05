import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookie());
  return NextResponse.json({ ok: true }, { status: 200, headers });
}
