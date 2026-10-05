import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/** Increment a video's view count. Public (no auth). */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  try {
    const updated = await db.video.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    });
    return NextResponse.json({ ok: true, viewCount: updated.viewCount });
  } catch {
    // video may not exist — fail silently
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}
