"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  LogOut,
  ExternalLink,
  Upload,
  Trash2,
  Pencil,
  Copy,
  FolderOpen,
  Film,
  Loader2,
  Save,
  Plus,
  AlertTriangle,
  HardDrive,
  Calendar,
  Link2,
  Download,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";

/* ----------------------------- Types ----------------------------- */

interface AdminGroup {
  id: string;
  name: string;
  slug: string;
  order: number;
  videoCount?: number;
}

interface AdminVideo {
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
  groupId: string | null;
  groupName: string | null;
  downloadable: boolean;
}

/* ----------------------------- Page ----------------------------- */

export default function AdminPage() {
  const [authed, setAuthed] = React.useState<boolean | null>(null);

  const checkSession = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = await res.json();
      setAuthed(Boolean(data?.authenticated));
    } catch {
      setAuthed(false);
    }
  }, []);

  React.useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold leading-tight sm:text-lg">
              پنل مدیریت ویدئو
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              مدیریت ویدئوها و گروه‌ها
            </p>
          </div>
          <div className="mr-auto flex items-center gap-2">
            {authed ? (
              <>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href="/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    مشاهده سایت
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    try {
                      await fetch("/api/admin/logout", { method: "POST" });
                    } catch {
                      // ignore
                    }
                    setAuthed(false);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  خروج
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          {authed === null ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">در حال بررسی نشست...</p>
            </div>
          ) : authed ? (
            <Dashboard />
          ) : (
            <LoginCard onLoginSuccess={() => setAuthed(true)} />
          )}
        </div>
      </main>

      <footer className="mt-auto border-t border-border/70 bg-background/80">
        <div className="flex h-12 items-center justify-center px-4 text-center text-xs text-muted-foreground">
          پنل مدیریت کتابخانه ویدئو — فقط برای مدیران
        </div>
      </footer>
    </div>
  );
}

/* ----------------------------- Login ----------------------------- */

function LoginCard({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "ورود ناموفق بود");
        toast.error(data?.error || "ورود ناموفق بود");
        return;
      }
      toast.success("خوش آمدید");
      onLoginSuccess();
    } catch {
      setError("ارتباط با سرور ناموفق بود");
      toast.error("ارتباط با سرور ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-center py-10"
    >
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">ورود به پنل مدیریت</CardTitle>
          <CardDescription>برای ادامه، رمز مدیریت را وارد کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">رمز مدیریت</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز را وارد کنید"
                autoFocus
                disabled={loading}
                aria-invalid={!!error}
              />
              {error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ورود...
                </>
              ) : (
                "ورود"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ----------------------------- Dashboard ----------------------------- */

function Dashboard() {
  return (
    <Tabs defaultValue="videos" className="gap-4">
      <TabsList>
        <TabsTrigger value="videos" className="gap-1.5">
          <Film className="h-4 w-4" />
          ویدئوها
        </TabsTrigger>
        <TabsTrigger value="groups" className="gap-1.5">
          <FolderOpen className="h-4 w-4" />
          گروه‌ها
        </TabsTrigger>
      </TabsList>
      <TabsContent value="videos">
        <VideosTab />
      </TabsContent>
      <TabsContent value="groups">
        <GroupsTab />
      </TabsContent>
    </Tabs>
  );
}

/* ----------------------------- Videos Tab ----------------------------- */

function VideosTab() {
  const [videos, setVideos] = React.useState<AdminVideo[]>([]);
  const [groups, setGroups] = React.useState<AdminGroup[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, gRes] = await Promise.all([
        fetch("/api/admin/videos", { cache: "no-store" }),
        fetch("/api/admin/groups", { cache: "no-store" }),
      ]);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVideos(vData?.videos ?? []);
      }
      if (gRes.ok) {
        const gData = await gRes.json();
        setGroups(gData?.groups ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <UploadCard groups={groups} onUploaded={refresh} />
      <VideosList videos={videos} groups={groups} loading={loading} onChanged={refresh} />
    </div>
  );
}

function UploadCard({
  groups,
  onUploaded,
}: {
  groups: AdminGroup[];
  onUploaded: () => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [displayName, setDisplayName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [groupId, setGroupId] = React.useState<string>("none");
  const [downloadable, setDownloadable] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const reset = () => {
    setFile(null);
    setDisplayName("");
    setSlug("");
    setDescription("");
    setGroupId("none");
    setDownloadable(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !displayName) {
      // pre-fill displayName from filename (strip extension)
      setDisplayName(f.name.replace(/\.mp4$/i, ""));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("فایل ویدئو را انتخاب کنید");
      return;
    }
    if (!displayName.trim()) {
      toast.error("نام نمایشی را وارد کنید");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".mp4")) {
      toast.error("فقط فایل‌های mp4 پذیرفته می‌شوند");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("displayName", displayName.trim());
      if (slug.trim()) form.append("slug", slug.trim());
      if (description.trim()) form.append("description", description.trim());
      if (groupId && groupId !== "none")
        form.append("groupId", groupId);
      form.append("downloadable", String(downloadable));
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "آپلود ناموفق بود");
        return;
      }
      toast.success("ویدئو با موفقیت آپلود شد");
      reset();
      onUploaded();
    } catch {
      toast.error("ارتباط با سرور ناموفق بود");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-5 w-5" />
          آپلود ویدئوی جدید
        </CardTitle>
        <CardDescription>
          فایل را انتخاب کنید و اطلاعات را تکمیل کنید.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="file">فایل ویدئو (mp4)</Label>
            <Input
              id="file"
              type="file"
              accept="video/mp4"
              onChange={onFileChange}
              disabled={uploading}
            />
            {file ? (
              <p className="text-xs text-muted-foreground">
                فایل: <span dir="ltr">{file.name}</span> —{" "}
                {formatBytes(file.size)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">نام نمایشی</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="مثلاً: درس اول"
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">اسلاگ (اختیاری)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="خودکار از نام"
              disabled={uploading}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group">گروه</Label>
            <Select value={groupId} onValueChange={setGroupId} disabled={uploading}>
              <SelectTrigger id="group" className="w-full">
                <SelectValue placeholder="بدون گروه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون گروه</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">توضیحات (اختیاری)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیح کوتاه درباره ویدئو..."
              disabled={uploading}
              className="min-h-20"
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3 sm:col-span-2">
            <Switch
              id="downloadable"
              checked={downloadable}
              onCheckedChange={setDownloadable}
              disabled={uploading}
            />
            <Label htmlFor="downloadable" className="cursor-pointer">
              قابل دانلود
              <span className="block text-xs font-normal text-muted-foreground">
                اگر فعال باشد، کاربر می‌تواند این ویدئو را دانلود کند
              </span>
            </Label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={uploading} className="gap-1.5">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال آپلود...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  آپلود
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function VideosList({
  videos,
  groups,
  loading,
  onChanged,
}: {
  videos: AdminVideo[];
  groups: AdminGroup[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = React.useState<AdminVideo | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">در حال بارگذاری...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Film className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            هنوز ویدئویی ثبت نشده است.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {videos.map((v) => (
        <VideoRow
          key={v.id}
          v={v}
          groups={groups}
          onEdit={() => setEditing(v)}
          onDelete={() => setDeletingId(v.id)}
        />
      ))}
      {editing ? (
        <EditVideoDialog
          video={editing}
          groups={groups}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      ) : null}
      <DeleteVideoDialog
        videoId={deletingId}
        onClose={() => setDeletingId(null)}
        onDeleted={() => {
          setDeletingId(null);
          onChanged();
        }}
      />
    </div>
  );
}

function VideoRow({
  v,
  groups,
  onEdit,
  onDelete,
}: {
  v: AdminVideo;
  groups: AdminGroup[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/?v=${encodeURIComponent(v.slug)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast("لینک کپی شد");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("کپی ناموفق بود");
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Film className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold leading-tight">
                {v.displayName}
              </h4>
              <Badge variant="secondary" className="text-[10px]" dir="ltr">
                {v.slug}
              </Badge>
              {v.groupName ? (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <FolderOpen className="h-3 w-3" />
                  {v.groupName}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  بدون گروه
                </Badge>
              )}
              {v.downloadable ? (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Download className="h-3 w-3" />
                  قابل دانلود
                </Badge>
              ) : null}
            </div>
            {v.description ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {v.description}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {v.sizeLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(v.createdAt).toLocaleDateString("fa-IR")}
              </span>
              <span className="inline-flex items-center gap-1" dir="ltr">
                <Link2 className="h-3 w-3" />
                <span className="truncate max-w-[200px]">{v.fileName}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Input
                readOnly
                value={link}
                className="h-8 text-[11px]"
                dir="ltr"
                aria-label="لینک مستقیم"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={copyLink}
                title="کپی لینک"
              >
                <Copy className={cn("h-4 w-4", copied && "text-primary")} />
              </Button>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
              ویرایش
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EditVideoDialog({
  video,
  groups,
  onClose,
  onSaved,
}: {
  video: AdminVideo;
  groups: AdminGroup[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = React.useState(video.displayName);
  const [slug, setSlug] = React.useState(video.slug);
  const [description, setDescription] = React.useState(video.description ?? "");
  const [groupId, setGroupId] = React.useState<string>(video.groupId ?? "none");
  const [downloadable, setDownloadable] = React.useState(video.downloadable);
  const [saving, setSaving] = React.useState(false);
  const [open, setOpen] = React.useState(true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string | boolean> = {};
      if (displayName.trim() && displayName !== video.displayName)
        body.displayName = displayName.trim();
      if (slug.trim() && slug !== video.slug) body.slug = slug.trim();
      if (description !== (video.description ?? ""))
        body.description = description;
      body.groupId = groupId === "none" ? "" : groupId;
      if (downloadable !== video.downloadable)
        body.downloadable = downloadable;
      const res = await fetch(`/api/admin/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "ذخیره ناموفق بود");
        return;
      }
      toast.success("تغییرات ذخیره شد");
      onSaved();
      setOpen(false);
      onClose();
    } catch {
      toast.error("ارتباط با سرور ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOpen(false);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ویرایش ویدئو</DialogTitle>
          <DialogDescription>
            تغییر اطلاعات نمایشی، اسلاگ، توضیحات یا گروه.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-displayName">نام نمایشی</Label>
            <Input
              id="e-displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-slug">اسلاگ</Label>
            <Input
              id="e-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={saving}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-description">توضیحات</Label>
            <Textarea
              id="e-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              className="min-h-20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-group">گروه</Label>
            <Select value={groupId} onValueChange={setGroupId} disabled={saving}>
              <SelectTrigger id="e-group" className="w-full">
                <SelectValue placeholder="بدون گروه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون گروه</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
            <Switch
              id="e-downloadable"
              checked={downloadable}
              onCheckedChange={setDownloadable}
              disabled={saving}
            />
            <Label htmlFor="e-downloadable" className="cursor-pointer">
              قابل دانلود
              <span className="block text-xs font-normal text-muted-foreground">
                اگر فعال باشد، کاربر می‌تواند این ویدئو را دانلود کند
              </span>
            </Label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                انصراف
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteVideoDialog({
  videoId,
  onClose,
  onDeleted,
}: {
  videoId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(videoId !== null);
  }, [videoId]);

  const confirm = async () => {
    if (!videoId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "حذف ناموفق بود");
        return;
      }
      toast.success("ویدئو حذف شد");
      setOpen(false);
      onDeleted();
    } catch {
      toast.error("ارتباط با سرور ناموفق بود");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            حذف ویدئو
          </AlertDialogTitle>
          <AlertDialogDescription>
            این عمل قابل بازگشت نیست. فایل ویدئو و رکورد آن از پایگاه داده حذف
            می‌شود. آیا مطمئن هستید؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirm();
            }}
            disabled={deleting}
            className="gap-1.5"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ----------------------------- Groups Tab ----------------------------- */

function GroupsTab() {
  const [groups, setGroups] = React.useState<AdminGroup[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/groups", { cache: "no-store" });
      const data = await res.json();
      setGroups(data?.groups ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <CreateGroupCard onCreated={refresh} />
      <GroupsList groups={groups} loading={loading} onChanged={refresh} />
    </div>
  );
}

function CreateGroupCard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("نام گروه را وارد کنید");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "ایجاد گروه ناموفق بود");
        return;
      }
      toast.success("گروه ایجاد شد");
      setName("");
      setSlug("");
      onCreated();
    } catch {
      toast.error("ارتباط با سرور ناموفق بود");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="h-5 w-5" />
          ایجاد گروه جدید
        </CardTitle>
        <CardDescription>
          گروه‌ها برای دسته‌بندی ویدئوها در صفحه اصلی استفاده می‌شوند.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="g-name">نام گروه</Label>
            <Input
              id="g-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: دروس ریاضی"
              disabled={creating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-slug">اسلاگ (اختیاری)</Label>
            <Input
              id="g-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="خودکار از نام"
              disabled={creating}
              dir="ltr"
            />
          </div>
          <Button type="submit" disabled={creating} className="gap-1.5">
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            ایجاد گروه
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function GroupsList({
  groups,
  loading,
  onChanged,
}: {
  groups: AdminGroup[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">در حال بارگذاری...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            هنوز گروهی ایجاد نشده است.
          </p>
        </CardContent>
      </Card>
    );
  }

  const editingGroup = groups.find((g) => g.id === editingId) ?? null;

  return (
    <>
      <div className="space-y-3">
        {groups.map((g) => (
          <Card key={g.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold leading-tight">
                      {g.name}
                    </h4>
                    <Badge variant="secondary" className="text-[10px]" dir="ltr">
                      {g.slug}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {g.videoCount ?? 0} ویدئو
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      ترتیب: {g.order}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setEditingId(g.id)}
                  >
                    <Pencil className="h-4 w-4" />
                    ویرایش
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    onClick={() => setDeletingId(g.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {editingGroup ? (
        <EditGroupDialog
          group={editingGroup}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            onChanged();
          }}
        />
      ) : null}
      <DeleteGroupDialog
        groupId={deletingId}
        groups={groups}
        onClose={() => setDeletingId(null)}
        onDeleted={() => {
          setDeletingId(null);
          onChanged();
        }}
      />
    </>
  );
}

function EditGroupDialog({
  group,
  onClose,
  onSaved,
}: {
  group: AdminGroup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(group.name);
  const [slug, setSlug] = React.useState(group.slug);
  const [order, setOrder] = React.useState(String(group.order));
  const [saving, setSaving] = React.useState(false);
  const [open, setOpen] = React.useState(true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string | number> = {};
      if (name.trim() && name !== group.name) body.name = name.trim();
      if (slug.trim() && slug !== group.slug) body.slug = slug.trim();
      const ord = parseInt(order, 10);
      if (!Number.isNaN(ord) && ord !== group.order) body.order = ord;
      const res = await fetch(`/api/admin/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "ذخیره ناموفق بود");
        return;
      }
      toast.success("تغییرات ذخیره شد");
      setOpen(false);
      onSaved();
      onClose();
    } catch {
      toast.error("ارتباط با سرور ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOpen(false);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ویرایش گروه</DialogTitle>
          <DialogDescription>
            نام، اسلاگ یا ترتیب نمایش گروه را تغییر دهید.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ge-name">نام</Label>
            <Input
              id="ge-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ge-slug">اسلاگ</Label>
            <Input
              id="ge-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={saving}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ge-order">ترتیب</Label>
            <Input
              id="ge-order"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              disabled={saving}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                انصراف
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              ذخیره
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGroupDialog({
  groupId,
  groups,
  onClose,
  onDeleted,
}: {
  groupId: string | null;
  groups: AdminGroup[];
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(groupId !== null);
  }, [groupId]);

  const g = groups.find((x) => x.id === groupId) ?? null;

  const confirm = async () => {
    if (!groupId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "حذف ناموفق بود");
        return;
      }
      toast.success("گروه حذف شد");
      setOpen(false);
      onDeleted();
    } catch {
      toast.error("ارتباط با سرور ناموفق بود");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            حذف گروه
          </AlertDialogTitle>
          <AlertDialogDescription>
            گروه «{g?.name ?? ""}» حذف می‌شود. ویدئوهای این گروه به حالت
            «بدون گروه» منتقل می‌شوند. آیا مطمئن هستید؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirm();
            }}
            disabled={deleting}
            className="gap-1.5"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
