"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface VideoItem {
  id: string;
  name: string;
  fileName: string;
  url: string;
  size: number;
  sizeLabel: string;
  modified: number;
  modifiedLabel: string;
}

export default function Home() {
  const [videos, setVideos] = React.useState<VideoItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const fetchVideos = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      if (!res.ok) throw new Error("خطا در دریافت لیست ویدئوها");
      const data = (await res.json()) as { videos: VideoItem[] };
      setVideos(data.videos ?? []);
      setSelectedId((prev) => {
        if (prev && data.videos.some((v) => v.id === prev)) return prev;
        return data.videos[0]?.id ?? null;
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

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((v) => v.name.toLowerCase().includes(q));
  }, [videos, query]);

  const selected = React.useMemo(
    () => videos.find((v) => v.id === selectedId) ?? null,
    [videos, selectedId],
  );

  const selectedIndex = React.useMemo(
    () => videos.findIndex((v) => v.id === selectedId),
    [videos, selectedId],
  );

  const selectNext = React.useCallback(
    (dir: 1 | -1) => {
      if (!videos.length) return;
      const next = selectedIndex + dir;
      if (next >= 0 && next < videos.length) setSelectedId(videos[next].id);
    },
    [videos, selectedIndex],
  );

  // Try to play when selection changes (user gesture from list click allows autoplay)
  React.useEffect(() => {
    if (selected && videoRef.current) {
      videoRef.current.load();
      const p = videoRef.current.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  }, [selected]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
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
              {videos.length} ویدئو
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
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
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
                      {selected.name}
                    </h2>
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
                        <span dir="ltr" className="truncate">
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
                      {selectedIndex + 1} از {videos.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedIndex >= videos.length - 1}
                      onClick={() => selectNext(1)}
                      className="gap-1"
                    >
                      بعدی
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <EmptyState loading={loading} error={error} />
              )}
            </AnimatePresence>
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
                {filtered.length !== videos.length && (
                  <Badge variant="outline" className="ms-auto text-[10px]">
                    {filtered.length}/{videos.length}
                  </Badge>
                )}
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
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {loading ? (
                <ListLoading />
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-50" />
                  {query ? "نتیجه‌ای یافت نشد" : "ویدئویی وجود ندارد"}
                </div>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((v, i) => {
                    const active = v.id === selectedId;
                    const realIndex = videos.findIndex((x) => x.id === v.id) + 1;
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(v.id)}
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
                              {v.name}
                            </span>
                            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{v.sizeLabel}</span>
                              <Separator
                                orientation="vertical"
                                className="h-3"
                              />
                              <span>{v.modifiedLabel}</span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer note inside sidebar */}
            <div className="border-t border-border/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
              ویدئوها از پوشه{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]" dir="ltr">
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
        <Inbox className="h-10 w-10 text-muted-foreground/60" />
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
