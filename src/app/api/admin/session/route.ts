import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authenticated = requireAdmin(request);
  return NextResponse.json({ authenticated });
}
