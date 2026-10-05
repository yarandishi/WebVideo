"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Play,
  Search,
  FileVideo,
  Film,
  Clapperboard,
  HardDrive,
  Calendar,
  ChevronRight,
  Inbox,
  Loader2,
  MonitorPlay,
  Link2,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getCachedBlob,
  setCachedBlob,
  makeBlobUrl,
} from "@/lib/video-cache";

interface VideoItem {
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
}

interface GroupItem {
  id: string;
  name: string;
  slug: string;
  order: number;
  videos: VideoItem[];
}

interface FetchResult {
  groups: GroupItem[];
  ungrouped: VideoItem[];
  total: number;
}

// All-videos flattened list, preserving group order then ungrouped.
function flattenVideos(data: FetchResult): VideoItem[] {
  const out: VideoItem[] = [];
  for (const g of data.groups) out.push(...g.videos);
  out.push(...data.ungrouped);
  return out;
}

function getInitialSlugFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  // ?v=slug takes precedence; #slug is a fallback.
  const qs = new URLSearchParams(window.location.search);
  const v = qs.get("v");
  if (v) return v;
  if (window.location.hash && window.location.hash.length > 1) {
    return decodeURIComponent(window.location.hash.slice(1));
  }
  return null;
}

export default function Home() {
  const [data, setData] = React.useState<FetchResult>({
    groups: [],
    ungrouped: [],
    total: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const currentBlobUrlRef = React.useRef<string | null>(null);

  const allVideos = React.useMemo(() => flattenVideos(data), [data]);

  const fetchVideos = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در دریافت لیست ویدئوها");
      const json = (await res.json()) as FetchResult;
      setData({
        groups: json.groups ?? [],
        ungrouped: json.ungrouped ?? [],
        total: json.total ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // On mount, read the slug from the URL.
  React.useEffect(() => {
    const slugFromUrl = getInitialSlugFromLocation();
    if (slugFromUrl) {
      setSelectedSlug(slugFromUrl);
    } else if (allVideos.length > 0) {
      setSelectedSlug(allVideos[0].slug);
    } else {
      setSelectedSlug(null);
    }
  }, [allVideos.length]);

  // Listen for popstate (back/forward) — update selection from URL.
  React.useEffect(() => {
    const onPop = () => {
      const slug = getInitialSlugFromLocation();
      if (slug) setSelectedSlug(slug);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const selected = React.useMemo(
    () => allVideos.find((v) => v.slug === selectedSlug) ?? null,
    [allVideos, selectedSlug],
  );

  const selectedIndex = React.useMemo(
    () => allVideos.findIndex((v) => v.slug === selectedSlug),
    [allVideos, selectedSlug],
  );

  const selectBySlug = React.useCallback(
    (slug: string | null) => {
      if (!slug) return;
      setSelectedSlug(slug);
      // Update the URL (replace, so we don't flood history)
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("v", slug);
        url.hash = "";
        if (url.searchParams.get("v") !== slug) {
          url.searchParams.set("v", slug);
        }
        // Use replaceState so it doesn't pile up history entries on each click
        window.history.replaceState({}, "", url.toString());
      }
    },
    [],
  );

  const selectNext = React.useCallback(
    (dir: 1 | -1) => {
      if (!allVideos.length) return;
      const next = selectedIndex + dir;
      if (next >= 0 && next < allVideos.length) {
        selectBySlug(allVideos[next].slug);
      }
    },
    [allVideos, selectedIndex, selectBySlug],
  );

  // Scroll the active item into view in the sidebar.
  React.useEffect(() => {
    if (!selectedSlug) return;
    const el = document.getElementById(`sidebar-item-${selectedSlug}`);
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedSlug]);

  // Video src + caching logic.
  React.useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const video = videoRef.current;

    // Revoke any previous blob URL.
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    const apply = async () => {
      if (!video || cancelled) return;
      // Try cache first.
      try {
        const cached = await getCachedBlob(selected.id);
        if (cancelled || !video) return;
        if (cached) {
          // Use cached blob
          const url = makeBlobUrl(cached);
          currentBlobUrlRef.current = url;
          video.src = url;
          video.load();
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
          return;
        }
      } catch {
        // ignore cache errors — fall through to network
      }
      // Not cached: set network URL for immediate playback + fetch blob for next time.
      video.src = selected.url;
      video.load();
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});

      // Background-fetch the blob to populate cache.
      try {
        const res = await fetch(selected.url);
        if (!res.ok) return;
        const blob = await res.blob();
        if (cancelled) return;
        await setCachedBlob(selected.id, blob);
      } catch {
        // ignore — cache is best-effort
      }
    };

    apply();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Cleanup the blob URL on unmount.
  React.useEffect(() => {
    return () => {
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
    };
  }, []);

  // Search filter — across all videos (flat list).
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null; // null means "no filter"
    return allVideos.filter(
      (v) =>
        v.displayName.toLowerCase().includes(q) ||
        v.slug.toLowerCase().includes(q),
    );
  }, [allVideos, query]);

  const renderSidebarList = () => {
    if (loading) return <ListLoading />;

    const itemsToRender = filtered ?? allVideos;
    if (itemsToRender.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
          <Inbox className="h-8 w-8 opacity-50" />
          {query ? "نتیجه‌ای یافت نشد" : "ویدئویی وجود ندارد"}
        </div>
      );
    }

    // If filtering, render a flat list.
    if (filtered) {
      return (
        <ul className="space-y-1">
          {filtered.map((v) => {
            const active = v.slug === selectedSlug;
            const realIndex = allVideos.findIndex((x) => x.slug === v.slug) + 1;
            return renderListItem(v, active, realIndex);
          })}
        </ul>
      );
    }

    // Otherwise render grouped.
    return (
      <div className="space-y-3">
        {data.groups.map((g) => (
          <div key={g.id} className="space-y-1">
            <div className="flex items-center gap-2 px-2 pt-1 pb-0.5">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <h4 className="text-xs font-semibold text-muted-foreground">
                {g.name}
              </h4>
              <Badge variant="outline" className="ms-auto text-[10px]">
                {g.videos.length}
              </Badge>
            </div>
            <ul className="space-y-1">
              {g.videos.map((v) => {
                const active = v.slug === selectedSlug;
                const realIndex = allVideos.findIndex((x) => x.slug === v.slug) + 1;
                return renderListItem(v, active, realIndex);
              })}
            </ul>
          </div>
        ))}
        {data.ungrouped.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 pt-1 pb-0.5">
              <FileVideo className="h-3.5 w-3.5 text-muted-foreground" />
              <h4 className="text-xs font-semibold text-muted-foreground">
                بدون گروه
              </h4>
              <Badge variant="outline" className="ms-auto text-[10px]">
                {data.ungrouped.length}
              </Badge>
            </div>
            <ul className="space-y-1">
              {data.ungrouped.map((v) => {
                const active = v.slug === selectedSlug;
                const realIndex = allVideos.findIndex((x) => x.slug === v.slug) + 1;
                return renderListItem(v, active, realIndex);
              })}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderListItem = (v: VideoItem, active: boolean, realIndex: number) => (
    <li key={v.id} id={`sidebar-item-${v.slug}`}>
      <button
        type="button"
        onClick={() => selectBySlug(v.slug)}
        aria-current={active ? "true" : undefined}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-right transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          active &&
            "border-border bg-accent text-accent-foreground shadow-sm",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
            active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground group-hover:border-foreground/20",
          )}
        >
          {active ? (
            <Play className="h-4 w-4 fill-current" />
          ) : (
            String(realIndex).padStart(2, "0")
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium leading-tight">
            {v.displayName}
          </span>
          <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{v.sizeLabel}</span>
            <Separator orientation="vertical" className="h-3" />
            <span>{v.modifiedLabel}</span>
          </span>
        </span>
      </button>
    </li>
  );

  const handleCopyLink = async () => {
    if (!selected) return;
    const link = `${window.location.origin}/?v=${encodeURIComponent(selected.slug)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast("لینک کپی شد", {
        description: link,
      });
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast("لینک کپی شد", { description: link });
      } catch {
        toast("کپی لینک ناموفق بود", { description: link });
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Clapperboard className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold leading-tight sm:text-lg">
              کتابخانه ویدئو
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              پخش آفلاین ویدئوهای آموزشی
            </p>
          </div>
          <div className="mr-auto flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Film className="h-3.5 w-3.5" />
              {allVideos.length} ویدئو
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_360px]">
        {/* Video section */}
        <section className="flex min-w-0 flex-col">
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 sm:p-6">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                  {/* Player */}
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-black shadow-lg ring-1 ring-black/5">
                    <video
                      ref={videoRef}
                      key={selected.id}
                      src={selected.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full bg-black"
                    />
                  </div>

                  {/* Title + meta */}
                  <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-bold leading-snug sm:text-2xl">
                      {selected.displayName}
                    </h2>
                    {selected.description ? (
                      <p className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                        {selected.description}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <HardDrive className="h-4 w-4" />
                        {selected.sizeLabel}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {selected.modifiedLabel}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FileVideo className="h-4 w-4" />
                        <span dir="ltr" className="truncate max-w-[280px]">
                          {selected.fileName}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Prev / Next controls */}
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedIndex <= 0}
                      onClick={() => selectNext(-1)}
                      className="gap-1"
                    >
                      <ChevronRight className="h-4 w-4" />
                      قبلی
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {selectedIndex + 1} از {allVideos.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedIndex >= allVideos.length - 1}
                      onClick={() => selectNext(1)}
                      className="gap-1"
                    >
                      بعدی
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </Button>
                  </div>

                  {/* Copy link button */}
                  <div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyLink}
                      className="gap-1.5"
                    >
                      <Link2 className="h-4 w-4" />
                      کپی لینک ویدئو
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <EmptyState loading={loading} error={error} />
              )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="border-t border-border bg-muted/30 lg:border-t-0 lg:border-r lg:bg-transparent">
          <div className="flex h-full flex-col">
            {/* Search */}
            <div className="space-y-3 border-b border-border/70 p-4">
              <div className="flex items-center gap-2">
                <MonitorPlay className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">لیست ویدئوها</h3>
                {filtered ? (
                  <Badge variant="outline" className="ms-auto text-[10px]">
                    {filtered.length}/{allVideos.length}
                  </Badge>
                ) : null}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی ویدئو..."
                  className="h-9 bg-background pr-9"
                  aria-label="جستجوی ویدئو"
                />
              </div>
            </div>

            {/* List */}
            <div className="min-h-0 max-h-[calc(100vh-220px)] overflow-y-auto p-2">
              {renderSidebarList()}
            </div>

            {/* Footer note inside sidebar */}
            <div className="border-t border-border/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
              ویدئوها از پوشه{" "}
              <code
                className="rounded bg-muted px-1 py-0.5 text-[10px]"
                dir="ltr"
              >
                public/videos
              </code>{" "}
              خوانده می‌شوند.
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/70 bg-background/80">
        <div className="flex h-12 items-center justify-center px-4 text-center text-xs text-muted-foreground">
          کتابخانه ویدئو — نمایش آفلاین ویدئوهای آموزشی
        </div>
      </footer>
    </div>
  );
}

function EmptyState({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">در حال بارگذاری...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Clapperboard className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">ویدئویی انتخاب نشده</p>
        <p className="text-sm text-muted-foreground">
          از لیست کناری یک ویدئو انتخاب کنید تا پخش شود.
        </p>
      </div>
    </div>
  );
}

function ListLoading() {
  return (
    <ul className="space-y-1 p-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5"
        >
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
