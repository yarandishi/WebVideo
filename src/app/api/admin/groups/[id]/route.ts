import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify, uniqueGroupSlug } from "@/lib/videos";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Params) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const group = await db.group.findUnique({
    where: { id },
    include: { _count: { select: { videos: true } } },
  });
  if (!group) {
    return NextResponse.json({ error: "گروه یافت نشد" }, { status: 404 });
  }
  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      slug: group.slug,
      order: group.order,
      videoCount: group._count.videos,
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: { name?: string; slug?: string; order?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
  const existing = await db.group.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "گروه یافت نشد" }, { status: 404 });
  }
  const data: { name?: string; slug?: string; order?: number } = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    const candidate = slugify(body.slug);
    if (candidate) {
      // ensure unique excluding self (append -2, -3, ... if needed)
      let current = candidate;
      let n = 2;
      while (true) {
        const found = await db.group.findFirst({
          where: { slug: current, NOT: { id } },
          select: { id: true },
        });
        if (!found) break;
        current = `${candidate}-${n}`;
        n++;
        if (n > 10000) break;
      }
      data.slug = current;
      void uniqueGroupSlug; // imported helper retained for clarity
    }
  }
  if (typeof body.order === "number" && Number.isFinite(body.order)) {
    data.order = body.order;
  }
  const updated = await db.group.update({ where: { id }, data });
  return NextResponse.json({
    group: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      order: updated.order,
    },
  });
}

export async function DELETE(request: Request, { params }: Params) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // onDelete: SetNull on the relation detaches videos
  await db.group.delete({ where: { id } }).catch(() => {
    // ignore not-found
  });
  return NextResponse.json({ ok: true });
}
