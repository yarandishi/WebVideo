import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { listGroupsWithCount, slugify, uniqueGroupSlug } from "@/lib/videos";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const groups = await listGroupsWithCount();
  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { name?: string; slug?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "نام گروه الزامی است" }, { status: 400 });
  }
  const slug = await uniqueGroupSlug(body?.slug ? slugify(body.slug) : slugify(name));
  // Determine order = max order + 1 (or 0)
  const maxOrder = await db.group.aggregate({ _max: { order: true } });
  const order = (maxOrder._max.order ?? -1) + 1;
  const created = await db.group.create({
    data: { name, slug, order },
  });
  return NextResponse.json({ group: created }, { status: 201 });
}
