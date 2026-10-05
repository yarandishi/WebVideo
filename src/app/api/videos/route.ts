import { NextResponse } from "next/server";
import { listVideosGrouped, syncFolderToDb } from "@/lib/videos";

export const dynamic = "force-dynamic";

export async function GET() {
  // Sync folder → DB first (idempotent; only adds new files)
  try {
    await syncFolderToDb();
  } catch (e) {
    // Log and continue — sync failures should not break the list entirely
    console.error("syncFolderToDb failed:", e);
  }
  try {
    const data = await listVideosGrouped();
    return NextResponse.json(data);
  } catch (e) {
    console.error("listVideosGrouped failed:", e);
    return NextResponse.json(
      { groups: [], ungrouped: [], total: 0, error: "خطا در دریافت لیست ویدئوها" },
      { status: 500 },
    );
  }
}
