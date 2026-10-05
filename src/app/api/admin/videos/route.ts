import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listAllVideosForAdmin,
  saveUploadedFile,
  slugify,
  uniqueSlug,
} from "@/lib/videos";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const videos = await listAllVideosForAdmin();
  return NextResponse.json({ videos });
}

export async function POST(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Parse multipart form
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
  const file = form.get("file");
  const displayName = String(form.get("displayName") ?? "").trim();
  const slugInput = String(form.get("slug") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const groupIdRaw = String(form.get("groupId") ?? "").trim();
  const downloadableRaw = String(form.get("downloadable") ?? "").trim();
  const downloadable = downloadableRaw === "true" || downloadableRaw === "1";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایل ویدئو الزامی است" }, { status: 400 });
  }
  // Validate extension
  const lowerName = (file.name || "").toLowerCase();
  if (!lowerName.endsWith(".mp4")) {
    return NextResponse.json(
      { error: "فقط فایل‌های mp4 پذیرفته می‌شوند" },
      { status: 400 },
    );
  }
  if (!displayName) {
    return NextResponse.json(
      { error: "نام نمایشی الزامی است" },
      { status: 400 },
    );
  }
  // Validate groupId (if provided)
  let groupId: string | null = null;
  if (groupIdRaw && groupIdRaw !== "none" && groupIdRaw !== "null") {
    const grp = await db.group.findUnique({
      where: { id: groupIdRaw },
      select: { id: true },
    });
    if (grp) groupId = grp.id;
  }

  // Save the file to disk
  const saved = await saveUploadedFile(file);

  // Compute slug
  const slug = await uniqueSlug(slugInput ? slugInput : displayName);

  // Insert into DB
  try {
    const created = await db.video.create({
      data: {
        fileName: saved.fileName,
        displayName,
        slug,
        description: description || null,
        filePath: saved.filePath,
        size: saved.size,
        groupId,
        downloadable,
      },
    });
    const url = `/${saved.filePath.split("/").map(encodeURIComponent).join("/")}`;
    return NextResponse.json(
      {
        video: {
          id: created.id,
          displayName: created.displayName,
          slug: created.slug,
          description: created.description,
          fileName: created.fileName,
          filePath: created.filePath,
          url,
          size: created.size,
          createdAt: created.createdAt.toISOString(),
          groupId: created.groupId,
          downloadable: created.downloadable,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    // Rollback the saved file
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      await fs.unlink(path.join(process.cwd(), "public", saved.filePath));
    } catch {
      // ignore
    }
    return NextResponse.json(
      { error: "ذخیره در پایگاه داده ناموفق بود" },
      { status: 500 },
    );
  }
}
