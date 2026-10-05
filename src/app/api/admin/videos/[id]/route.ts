import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteVideoFile, slugify } from "@/lib/videos";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Params) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const v = await db.video.findUnique({
    where: { id },
    include: { group: { select: { name: true } } },
  });
  if (!v) {
    return NextResponse.json({ error: "ویدئو یافت نشد" }, { status: 404 });
  }
  const url = `/${v.filePath.split("/").map(encodeURIComponent).join("/")}`;
  return NextResponse.json({
    video: {
      id: v.id,
      displayName: v.displayName,
      slug: v.slug,
      description: v.description,
      fileName: v.fileName,
      filePath: v.filePath,
      url,
      size: v.size,
      createdAt: v.createdAt.toISOString(),
      groupId: v.groupId,
      groupName: v.group?.name ?? null,
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: {
    displayName?: string;
    slug?: string;
    description?: string;
    groupId?: string | null;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
  const existing = await db.video.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "ویدئو یافت نشد" }, { status: 404 });
  }
  const data: {
    displayName?: string;
    slug?: string;
    description?: string | null;
    groupId?: string | null;
  } = {};
  if (typeof body.displayName === "string" && body.displayName.trim()) {
    data.displayName = body.displayName.trim();
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    const candidate = slugify(body.slug);
    if (candidate) {
      // ensure unique excluding self
      let current = candidate;
      let n = 2;
      while (true) {
        const found = await db.video.findFirst({
          where: { slug: current, NOT: { id } },
          select: { id: true },
        });
        if (!found) break;
        current = `${candidate}-${n}`;
        n++;
        if (n > 10000) break;
      }
      data.slug = current;
    }
  }
  if (typeof body.description === "string") {
    data.description = body.description.trim() || null;
  }
  if (body.groupId !== undefined) {
    // null/"" → ungrouped; otherwise must be valid group id
    const val = body.groupId ? String(body.groupId).trim() : "";
    if (!val || val === "none" || val === "null") {
      data.groupId = null;
    } else {
      const grp = await db.group.findUnique({
        where: { id: val },
        select: { id: true },
      });
      if (grp) data.groupId = grp.id;
      else data.groupId = null;
    }
  }
  const updated = await db.video.update({ where: { id }, data });
  const url = `/${updated.filePath.split("/").map(encodeURIComponent).join("/")}`;
  return NextResponse.json({
    video: {
      id: updated.id,
      displayName: updated.displayName,
      slug: updated.slug,
      description: updated.description,
      fileName: updated.fileName,
      filePath: updated.filePath,
      url,
      size: updated.size,
      createdAt: updated.createdAt.toISOString(),
      groupId: updated.groupId,
    },
  });
}

export async function DELETE(request: Request, { params }: Params) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const v = await db.video.findUnique({
    where: { id },
    select: { id: true, filePath: true },
  });
  if (!v) {
    return NextResponse.json({ error: "ویدئو یافت نشد" }, { status: 404 });
  }
  await deleteVideoFile(v.filePath);
  await db.video.delete({ where: { id } }).catch(() => {
    // ignore
  });
  return NextResponse.json({ ok: true });
}
