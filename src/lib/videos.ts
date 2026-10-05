import fs from "fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { formatBytes, formatDate } from "@/lib/format";

export { formatBytes, formatDate };

export const VIDEOS_DIR = path.join(process.cwd(), "public", "videos");

/**
 * slugify: keep Persian letters, ASCII letters (lowercased), digits.
 * Spaces/underscores → "-". Strip other punctuation. Collapse dashes.
 */
export function slugify(input: string): string {
  const s = (input ?? "").toString();
  if (!s) return "";
  // Normalize: lowercased ASCII letters; keep Persian letters (\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF); keep digits.
  const lower = s.toLowerCase();
  // Replace spaces/underscores with dash
  let out = lower.replace(/[\s_]+/g, "-");
  // Strip anything that's not Persian letter, ASCII letter, digit, or dash
  out = out.replace(/[^a-z0-9\u0600-\u06ff\ufb50-\ufdff\ufe70-\ufeff-]+/g, "");
  // Collapse multiple dashes
  out = out.replace(/-+/g, "-");
  // Trim leading/trailing dashes
  out = out.replace(/^-+|-+$/g, "");
  return out;
}

/** Generate a random fallback slug like `vid-abc123`. */
function randomFallback(): string {
  return `vid-${crypto.randomBytes(3).toString("hex")}`;
}

/**
 * uniqueSlug: if `base` is taken in the DB, append `-2`, `-3`, ... until unique.
 * Empty base → `vid-<rand6>`.
 */
export async function uniqueSlug(base: string): Promise<string> {
  let candidate = slugify(base ?? "");
  if (!candidate) candidate = randomFallback();
  // If the candidate is already unique, return it. Otherwise append -2, -3, ...
  let n = 2;
  // Use a single query loop
  let current = candidate;
  while (true) {
    const existing = await db.video.findUnique({ where: { slug: current }, select: { id: true } });
    if (!existing) {
      // also check groups since both Video and Group use slugs — we want video slugs unique among videos per schema
      return current;
    }
    current = `${candidate}-${n}`;
    n++;
    if (n > 10000) {
      // Extremely unlikely; give up and use random
      return randomFallback();
    }
  }
}

/** Like uniqueSlug but for groups. */
export async function uniqueGroupSlug(base: string): Promise<string> {
  let candidate = slugify(base ?? "");
  if (!candidate) candidate = `grp-${crypto.randomBytes(3).toString("hex")}`;
  let n = 2;
  let current = candidate;
  while (true) {
    const existing = await db.group.findUnique({ where: { slug: current }, select: { id: true } });
    if (!existing) return current;
    current = `${candidate}-${n}`;
    n++;
    if (n > 10000) return `grp-${crypto.randomBytes(3).toString("hex")}`;
  }
}

export interface ScannedFile {
  fileName: string;
  /** path relative to public/, e.g. "videos/sub/a.mp4" */
  filePath: string;
  size: number;
}

/** Recursively scan VIDEOS_DIR for .mp4 files. */
export async function scanMp4Files(): Promise<ScannedFile[]> {
  const items: ScannedFile[] = [];
  const walk = async (dir: string, base: string) => {
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile() && /\.mp4$/i.test(entry.name)) {
        try {
          const stat = await fs.stat(full);
          items.push({
            fileName: entry.name,
            filePath: `videos/${rel}`,
            size: stat.size,
          });
        } catch {
          // ignore unreadable
        }
      }
    }
  };
  // Ensure dir exists
  try {
    await fs.mkdir(VIDEOS_DIR, { recursive: true });
  } catch {
    // ignore
  }
  await walk(VIDEOS_DIR, "");
  return items;
}

/** Scan folder and import any new mp4 files into the DB. Returns count imported. */
export async function syncFolderToDb(): Promise<number> {
  const scanned = await scanMp4Files();
  if (scanned.length === 0) return 0;
  const fileNames = scanned.map((s) => s.fileName);
  // Find which fileNames already exist
  const existing = await db.video.findMany({
    where: { fileName: { in: fileNames } },
    select: { fileName: true },
  });
  const existingSet = new Set(existing.map((v) => v.fileName));
  let imported = 0;
  for (const f of scanned) {
    if (existingSet.has(f.fileName)) continue;
    const displayName = f.fileName.replace(/\.mp4$/i, "");
    const slug = await uniqueSlug(displayName);
    try {
      await db.video.create({
        data: {
          fileName: f.fileName,
          displayName,
          slug,
          description: null,
          filePath: f.filePath,
          size: f.size,
          groupId: null,
        },
      });
      imported++;
    } catch {
      // ignore insert errors (e.g. race)
    }
  }
  return imported;
}

/** Save an uploaded File to VIDEOS_DIR with a cuid-style name. */
export async function saveUploadedFile(file: File): Promise<{ fileName: string; filePath: string; size: number }> {
  const ext = path.extname(file.name || "").toLowerCase() || ".mp4";
  const fileName = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  const filePath = `videos/${fileName}`;
  const dest = path.join(VIDEOS_DIR, fileName);
  try {
    await fs.mkdir(VIDEOS_DIR, { recursive: true });
  } catch {
    // ignore
  }
  // Handle name collisions just in case
  let finalDest = dest;
  let finalFileName = fileName;
  let finalPath = filePath;
  let counter = 0;
  while (true) {
    try {
      await fs.access(finalDest);
      // exists, append counter
      counter++;
      finalFileName = `${crypto.randomBytes(16).toString("hex")}-${counter}${ext}`;
      finalPath = `videos/${finalFileName}`;
      finalDest = path.join(VIDEOS_DIR, finalFileName);
    } catch {
      // doesn't exist — proceed to write
      break;
    }
  }
  // Convert Blob/ArrayBuffer to Buffer and write
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(finalDest, buffer);
  return { fileName: finalFileName, filePath: finalPath, size: buffer.byteLength };
}

/** Delete a video file from public/ by relative path. Ignore errors. */
export async function deleteVideoFile(filePath: string): Promise<void> {
  try {
    const abs = path.join(process.cwd(), "public", filePath);
    await fs.unlink(abs);
  } catch {
    // ignore
  }
}

export interface PublicVideo {
  id: string;
  displayName: string;
  slug: string;
  description: string | null;
  fileName: string;
  filePath: string;
  url: string;
  size: number;
  sizeLabel: string;
  modifiedLabel: string;
  createdAt: string;
  groupId: string | null;
  downloadable: boolean;
}

export interface PublicGroup {
  id: string;
  name: string;
  slug: string;
  order: number;
  videos: PublicVideo[];
}

export interface GroupedList {
  groups: PublicGroup[];
  ungrouped: PublicVideo[];
  total: number;
}

function buildUrl(filePath: string): string {
  return `/${filePath.split("/").map(encodeURIComponent).join("/")}`;
}

function toPublicVideo(v: {
  id: string;
  displayName: string;
  slug: string;
  description: string | null;
  fileName: string;
  filePath: string;
  size: number;
  createdAt: Date;
  groupId: string | null;
  downloadable: boolean;
}): PublicVideo {
  return {
    id: v.id,
    displayName: v.displayName,
    slug: v.slug,
    description: v.description,
    fileName: v.fileName,
    filePath: v.filePath,
    url: buildUrl(v.filePath),
    size: v.size,
    sizeLabel: formatBytes(v.size),
    modifiedLabel: formatDate(v.createdAt),
    createdAt: v.createdAt.toISOString(),
    groupId: v.groupId,
    downloadable: v.downloadable,
  };
}

/** List all videos grouped by group (ordered by order/name) + ungrouped. */
export async function listVideosGrouped(): Promise<GroupedList> {
  const [groups, ungroupedRows] = await Promise.all([
    db.group.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        videos: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    db.video.findMany({
      where: { groupId: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const groupsOut: PublicGroup[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    order: g.order,
    videos: g.videos.map(toPublicVideo),
  }));
  const ungrouped = ungroupedRows.map(toPublicVideo);
  const total = groupsOut.reduce((acc, g) => acc + g.videos.length, 0) + ungrouped.length;
  return { groups: groupsOut, ungrouped, total };
}

/** List all groups with counts (for admin). */
export async function listGroupsWithCount(): Promise<
  { id: string; name: string; slug: string; order: number; videoCount: number }[]
> {
  const groups = await db.group.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { videos: true } } },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    order: g.order,
    videoCount: g._count.videos,
  }));
}

/** List all videos (for admin), with group name. */
export async function listAllVideosForAdmin(): Promise<
  {
    id: string;
    displayName: string;
    slug: string;
    description: string | null;
    fileName: string;
    filePath: string;
    url: string;
    size: number;
    sizeLabel: string;
    createdAt: string;
    updatedAt: string;
    groupId: string | null;
    groupName: string | null;
  }[]
> {
  const rows = await db.video.findMany({
    orderBy: { createdAt: "asc" },
    include: { group: { select: { name: true } } },
  });
  return rows.map((v) => ({
    id: v.id,
    displayName: v.displayName,
    slug: v.slug,
    description: v.description,
    fileName: v.fileName,
    filePath: v.filePath,
    url: buildUrl(v.filePath),
    size: v.size,
    sizeLabel: formatBytes(v.size),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    groupId: v.groupId,
    groupName: v.group?.name ?? null,
    downloadable: v.downloadable,
  }));
}
