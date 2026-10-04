import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const VIDEOS_DIR = path.join(process.cwd(), "public", "videos");

export interface VideoItem {
  id: string;
  name: string;
  fileName: string;
  url: string;
  size: number;
  sizeLabel: string;
  modified: number;
  modifiedLabel: string;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1,
  );
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("fa-IR");
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

async function scanDir(dir: string, base = ""): Promise<VideoItem[]> {
  const items: VideoItem[] = [];
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return items;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      items.push(...(await scanDir(full, rel)));
    } else if (entry.isFile() && /\.mp4$/i.test(entry.name)) {
      try {
        const stat = await fs.stat(full);
        const relPath = `videos/${rel}`
          .split("/")
          .map(encodeURIComponent)
          .join("/");
        items.push({
          id: Buffer.from(rel).toString("base64url"),
          name: entry.name.replace(/\.mp4$/i, ""),
          fileName: entry.name,
          url: `/${relPath}`,
          size: stat.size,
          sizeLabel: formatBytes(stat.size),
          modified: stat.mtimeMs,
          modifiedLabel: formatDate(stat.mtimeMs),
        });
      } catch {
        // ignore unreadable files
      }
    }
  }
  return items;
}

export async function GET() {
  try {
    await fs.mkdir(VIDEOS_DIR, { recursive: true });
  } catch {
    // ignore
  }
  const videos = await scanDir(VIDEOS_DIR);
  videos.sort((a, b) => a.name.localeCompare(b.name, "fa", { numeric: true }));
  return NextResponse.json({ videos, total: videos.length });
}
