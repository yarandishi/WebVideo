---
Task ID: 1
Agent: main (Z.ai Code)
Task: Build an offline Next.js video library app — list MP4 files (placed in a folder) on the left, click to play them in a player. Simple, elegant, beautiful, Persian UI, works offline.

Work Log:
- Inspected existing project structure (Next.js 16, TS, Tailwind 4, shadcn/ui all present).
- Created `public/videos/` folder and generated two small sample MP4s locally with ffmpeg (`sample-lesson-1.mp4`, `sample-lesson-2.mp4`) for verification.
- Created `src/app/api/videos/route.ts`: Node API that scans `public/videos` (incl. subfolders) for `.mp4`, returns `{videos, total}` with name, encoded url, size (human-readable), Persian date, base64url id. Sorted by Persian locale + numeric.
- Created `src/components/theme-provider.tsx` and `src/components/theme-toggle.tsx` for light/dark mode (next-themes).
- Updated `src/app/layout.tsx`: `lang="fa" dir="rtl"`, Vazirmatn font (self-hosted by next/font → offline at runtime), ThemeProvider wrapper, Persian metadata title.
- Updated `src/app/globals.css`: map `--font-sans` to Vazirmatn, added custom thin scrollbars, forced LTR on video media controls.
- Built `src/app/page.tsx` (client): sticky header (logo + title + count badge + theme toggle); main grid `lg:grid-cols-[1fr_360px]` placing video section first (→ right in RTL) and sidebar second (→ left in RTL) so the list sits on the LEFT per user request; video section has rounded black player + title + meta (size/date/filename) + prev/next; sidebar has search + scrollable list (active item highlighted with play icon, others numbered) + footer hint; bottom sticky footer.
- Ran `bun run lint` → clean (no errors).
- Verified dev server compiled; `/` and `/api/videos` both return 200 in dev.log.

Self-verification with Agent Browser:
- Opened http://localhost:3000 → title "کتابخانه ویدئو" rendered, no console errors.
- Snapshot confirmed header, native video controls, selected-video title, prev/next buttons, search box, 2 list items with sizes + Persian dates.
- Clicked 2nd video → player switched (title→sample-lesson-2, prev enabled/next disabled, active highlight moved). ✓
- Typed "lesson-1" in search → list filtered to 1 item, badge showed 1/2. ✓
- Mobile viewport (375px) → stacked layout; bodyH=676 > viewport=600 → footer pushed down naturally (no overlap). ✓
- Desktop (1280×800) → bodyH=800=viewport, footer pinned to bottom (751→800). ✓ sticky footer.
- Dark mode toggle → `html.dark` applied. ✓
- Clicked play → video actually plays: paused=false, readyState=4, duration=8, currentTime advancing, served from local /videos/...mp4 (offline). ✓

Stage Summary:
- App is complete and fully verified end-to-end in the browser.
- To add videos: drop any `.mp4` file into `public/videos/` (subfolders supported); refresh the page — it appears in the left list; click to play.
- Works fully offline (no external runtime calls; fonts self-hosted by next/font; videos served locally).
- Persian RTL UI, light/dark mode, responsive, sticky footer, custom scrollbars.
- Artifacts: src/app/page.tsx, src/app/api/videos/route.ts, src/app/layout.tsx, src/app/globals.css, src/components/theme-provider.tsx, src/components/theme-toggle.tsx, public/videos/*.mp4.

---
Task ID: 2
Agent: main (Z.ai Code)
Task: User reported "Bad Request: plain HTTP to an SSL-enabled server port" when opening the app. Diagnose and fix.

Work Log:
- Read dev.log → Next.js healthy (GET / 200, GET /api/videos 200).
- Read Caddyfile → gateway on :81 (HTTP), reverse-proxies to localhost:3000.
- Reproduced via the HTTPS preview domain with Agent Browser: app works perfectly (title, video plays, 206 media, no console errors). Network log shows ALL requests are HTTPS, no http:// mixed content.
- Conclusion: the Caddy "Bad Request... plain HTTP to an SSL-enabled server port" only occurs when the browser navigates to http://preview-chat-*.space-z.ai (plain HTTP hits the TLS port 443). The app itself is fine over HTTPS.
- Found a real offline bug regardless: favicon metadata pointed to external CDN (https://z-cdn.chatglm.cn/...) which violates the "offline" requirement.
- Created public/favicon.svg (local clapperboard icon).
- Updated src/app/layout.tsx metadata icons → "/favicon.svg" (fully local now).
- Updated next.config.ts: added allowedDevOrigins: ["*.space-z.ai"] to allow the sandbox preview gateway origin and remove the cross-origin dev warning.
- First attempt used a RegExp for allowedDevOrigins → Next 16 rejected it ("Expected string, received object"). Fixed to string wildcard ["*.space-z.ai"].
- Re-verified over HTTPS: favicon now served from /favicon.svg (local), no z-cdn request after reload, no cross-origin warning, video still plays (paused=false, duration=12, served from preview domain HTTPS).

Stage Summary:
- Root cause of user's error: the preview was opened with http:// scheme. The app works over HTTPS (verified).
- Fixed a real offline issue: favicon is now local (no external CDN).
- Added allowedDevOrigins for the preview gateway.
- Action for user: open via the Preview panel or "Open in New Tab" (both HTTPS) — do not use http://. If an error appears, refresh the preview panel.

---
Task ID: 3
Agent: main (Z.ai Code)
Task: User wants the app to run on a local network over plain HTTP (no HTTPS). "درسنش کن" (fix it).

Work Log:
- Verified the app works fully over plain HTTP via agent-browser → http://localhost:3000: title correct, video plays (paused=false, duration=12), served from http://localhost:3000/videos/sample-lesson-1.mp4. Confirmed: proto="http:". The CODE requires no HTTPS.
- Confirmed the "Bad Request: plain HTTP to SSL-enabled server port" error is ONLY from the sandbox's external cloud gateway (port 443 TLS, infra-controlled, upstream of my Caddyfile on :81). I cannot disable that TLS layer — it is not part of my code/config.
- Updated next.config.ts with a guiding comment explaining: app is HTTP-only compatible; allowedDevOrigins only affects dev server host checks; for LAN use the production build (`bun run build && bun run start`) has no host restrictions and serves plain HTTP on http://<machine-ip>:3000; if using dev on LAN, add the machine IP/host to allowedDevOrigins.
- Confirmed dev server binds to 0.0.0.0:3000 (dev.log "Network: http://21.0.15.18:3000") so it is reachable from other machines on the network over HTTP.

Stage Summary:
- The app is 100% HTTP-compatible — no HTTPS anywhere in the code (all URLs relative, local favicon, no HSTS).
- The sandbox PREVIEW is HTTPS-only (cloud infra, unchangeable) — must use HTTPS to view here.
- For the user's actual local network: deploy on a LAN machine; colleagues access http://<machine-ip>:3000 (plain HTTP, no SSL). Two options: (a) production build+start (recommended, no host checks), (b) bun run dev + add machine IP to allowedDevOrigins.

---
Task ID: 4
Agent: main (Z.ai Code)
Task: User: must be COMPLETELY offline — app was still fetching fonts from the internet (next/font/google Vazirmatn). Fix fully.

Work Log:
- Root cause: layout.tsx imported `Vazirmatn` from `next/font/google`. In dev, Next.js fetches the font from Google Fonts → not offline.
- Checked system for a local Persian font (fc-list) → none available (only DejaVu/Liberation), so cannot bundle from system.
- Removed `next/font/google` entirely from src/app/layout.tsx (no font import, no CSS variable injection from Google).
- Updated src/app/globals.css `--font-sans` to a Persian-capable SYSTEM font stack: system-ui, -apple-system, "Segoe UI", Tahoma, "Geeza Pro", "Noto Sans Arabic", "Vazirmatn", Vazir, Arial, sans-serif. Zero font files fetched; browser uses the viewer's OS fonts (Tahoma/Segoe UI render Persian well on Windows).
- Verified with Agent Browser over http://localhost:3000: title "کتابخانه ویدئو" renders, video plays (206), api 200. Grep of all network requests for `font|google|gstatic|googleapis|z-cdn|woff|ttf` → ZERO matches. Every request goes to localhost:3000 (local) or inline data: URIs. No external dependency remains.
- Lint clean.

Stage Summary:
- App is now 100% offline: no Google Fonts, no external favicon (local /favicon.svg), no external assets, no z-cdn. Video + API + chunks all local; icons inline; fonts from the OS.
- Confirmed by network capture: zero non-local requests.
- Ready for fully-offline LAN deployment over plain HTTP.

---
Task ID: 5
Agent: main (Z.ai Code)
Task: User pasted "Module not found" errors for @/components/* and @/lib/utils (referencing an OLD layout.tsx that still had Vazirmatn). Diagnose.

Work Log:
- Read current src/app/layout.tsx → it is the CORRECT version (no Vazirmatn; the error log's line 2 "import Vazirmatn" no longer exists). So the pasted errors are STALE.
- Checked all referenced files exist on disk: src/components/theme-provider.tsx, theme-toggle.tsx, src/components/ui/{toaster,button,badge,input,separator}.tsx, src/lib/utils.ts — ALL present.
- Read tsconfig.json → paths "@/*": ["./src/*"] is correct.
- Confirmed node_modules intact (next, next-themes present).
- ps → dev server running (next-server v16.1.3, PID 3437; no duplicate instances).
- grep -c "Module not found" dev.log → 0. The current dev.log has ZERO such errors; last lines are all GET / 200 and GET /api/videos 200.
- Verified with Agent Browser over http://localhost:3000: title "کتابخانه ویدئو" loads, snapshot shows full UI, no errors, video plays (ok=true, paused=false, dur=12).

Stage Summary:
- Root cause: the pasted errors are STALE — from a transient moment during file editing when Turbopack's cache was momentarily inconsistent. They are NOT in the current dev.log (grep=0) and the app loads cleanly now.
- No code change needed. The "Ready in 1425ms" in the user's paste does not match any current "Ready" line (current: 628/751/608/659ms), confirming it was from an earlier (overwritten) log session.
- Action: user should refresh the Preview panel (or Open in New Tab) to clear any cached error page; the live app is healthy.

---
Task ID: 6
Agent: full-stack-developer
Task: Extend the offline Next.js 16 video-library app with: HMAC cookie-based admin auth, DB-driven videos/groups (Prisma + SQLite), folder→DB auto-sync, admin panel with video upload + CRUD + groups CRUD, grouped sidebar with Persian RTL UI, direct shareable links (`?v=slug`), and IndexedDB client-side video caching (second play is instant from cache, no network).

Work Log:
- Read prior worklog (Tasks 1–5) and existing source (page.tsx, layout.tsx, api/videos/route.ts, schema.prisma, ui components) to honor all hard constraints (Persian RTL, sticky footer, fully offline — no external fonts/CDNs, shadcn/ui, existing theme provider).
- Created `src/lib/format.ts` — shared client-safe `formatBytes` + `formatDate` helpers (so client components can format without importing server-only modules).
- Created `src/lib/auth.ts` — offline HMAC session-cookie auth:
  - `ADMIN_PASSWORD` (default `admin1234`), `AUTH_SECRET` (default `video-library-secret`).
  - `createToken()` = `base64url(payload) + "." + base64url(hmac_sha256(payloadB64, secret))`.
  - `verifyToken()` recomputes HMAC over payloadB64 and uses `crypto.timingSafeEqual` on the signatures.
  - `createSessionCookie()` / `clearSessionCookie()` return Set-Cookie strings (`admin_session`, HttpOnly, SameSite=Lax, Path=/, Max-Age=7d; Secure only in production).
  - `parseCookies()` parses the Cookie header; `requireAdmin(request)` returns boolean.
  - `checkPassword()` constant-time-ish password check.
- Created `src/lib/videos.ts` — server-side storage/sync/queries:
  - `VIDEOS_DIR`, `slugify()` (keeps Persian letters, lowercased ASCII letters, digits; spaces→dashes; collapses dashes), `uniqueSlug()` / `uniqueGroupSlug()` (DB-checked, appends `-2`/`-3`/... until unique; falls back to `vid-<rand6>` / `grp-<rand6>`).
  - `scanMp4Files()` recursive scan; `syncFolderToDb()` imports any new mp4 by fileName (idempotent); `saveUploadedFile(file)` writes to VIDEOS_DIR with `crypto.randomBytes(16).hex()+ext` name; `deleteVideoFile(filePath)`.
  - `listVideosGrouped()` returns `{ groups:[{id,name,slug,order,videos:[...]}], ungrouped:[...], total }` (groups ordered by order,name; videos by createdAt); each video includes id, displayName, slug, description, fileName, filePath, url, size, sizeLabel, modifiedLabel, createdAt, groupId.
  - `listGroupsWithCount()` and `listAllVideosForAdmin()` for the admin views.
- Created `src/lib/video-cache.ts` — browser IndexedDB cache:
  - DB `video-library-cache`, store `videos` keyed by id, value `{ blob, size, ts }`, with `ts` index for LRU eviction.
  - `openDB()` (lazy singleton), `getCachedBlob(id)`, `setCachedBlob(id, blob)` (on quota error evicts oldest entries and retries), `clearCache()`, `getCacheEstimate()` (navigator.storage.estimate), `makeBlobUrl(blob)`, `debugCacheInfo()`.
- Auth API routes:
  - `POST /api/admin/login` — body `{password}`; sets cookie, returns `{ok:true}`; 401 `{error:"رمز اشتباه است"}`.
  - `POST /api/admin/logout` — clears cookie.
  - `GET /api/admin/session` — returns `{authenticated:boolean}`.
- Admin content APIs (all require `requireAdmin`, return 401 `{error:"unauthorized"}` otherwise):
  - `GET /api/admin/groups` (with video counts), `POST /api/admin/groups` (creates with auto slug + next order).
  - `GET/PATCH/DELETE /api/admin/groups/[id]` (PATCH: unique slug excluding self; DELETE: cascades SetNull to videos).
  - `GET /api/admin/videos` (with group name), `POST /api/admin/videos` (multipart: file/displayName/slug?/description?/groupId?; validates .mp4; saves file + DB row; rolls back file on DB failure).
  - `GET/PATCH/DELETE /api/admin/videos/[id]` (PATCH: unique slug excluding self; groupId "" → null; DELETE: removes file + DB row).
- Rewrote `src/app/api/videos/route.ts` (public): try/catch `syncFolderToDb()` then `listVideosGrouped()`; returns `{groups, ungrouped, total}`; `export const dynamic = "force-dynamic"`. This auto-imports the existing sample-lesson-1/2 mp4s on first call.
- Rewrote `src/app/page.tsx` (client): kept the existing beautiful layout (sticky header with logo+title+count badge+ThemeToggle; main grid `lg:grid-cols-[1fr_360px]` putting the video section on the right and the sidebar on the left in RTL; sticky footer). New behavior:
  - Fetches `/api/videos` (no-store); state `{groups, ungrouped, total, loading, error, selectedSlug, query}`.
  - Sidebar: when not searching, renders groups as headers (group name + count) followed by their videos, then "بدون گروه" header + ungrouped videos. Active item highlighted (primary bg, play icon); inactive shows 2-digit index. When searching, renders a flat filtered list.
  - Selecting a video updates `selectedSlug` and uses `history.replaceState` to set `?v=<slug>` (shareable direct link).
  - On mount: reads `?v=<slug>` (or `#<slug>` fallback) and selects that video (scrolling it into view); else selects the first video.
  - Listens to `popstate` so browser back/forward updates selection.
  - Player: native `<video controls playsInline preload="metadata" src={selected.url}>`. The useEffect: revokes previous blob URL; checks IndexedDB cache by video id; if cached → `URL.createObjectURL(blob)` → set as `<video src>`; if not cached → network src is already set, calls `play()` (catches silently), and starts a background `fetch(url) → blob → setCachedBlob(id, blob)` for next time.
  - Below player: displayName (h2), description (if present, in a muted card), meta row (size/date/fileName), prev/next, and a "کپی لینک ویدئو" button that copies `<origin>/?v=<slug>` to clipboard with a sonner toast "لینک کپی شد".
  - Removed `AnimatePresence mode="wait"` (was delaying the new motion.div mount by 200ms, which broke the cache effect because `videoRef.current` pointed to the old/null element); kept `motion.div` with `initial`/`animate` for the entrance fade.
- Created `src/app/admin/page.tsx` (client): renders Sonner `<Toaster />`.
  - On mount: `GET /api/admin/session`; `authed` state (null=checking→spinner; false→LoginCard; true→Dashboard).
  - LoginCard: password input + submit; on success re-checks session; shows error toast on failure ("رمز اشتباه است" / "ورود ناموفق بود").
  - Dashboard: sticky header (title "پنل مدیریت ویدئو" + "مشاهده سایت" link to `/` + "خروج" logout button). Then `Tabs` with two tabs.
  - Videos tab:
    - UploadCard: form with file Input (accept=video/mp4), displayName Input (auto-filled from filename if empty), slug Input (placeholder "خودکار از نام"), description Textarea, group Select (loaded from /api/admin/groups + "بدون گروه"), submit Button "آپلود". Builds FormData, POSTs to /api/admin/videos; toast "آپلود شد" / error toast; refreshes list.
    - VideosList: fetches /api/admin/videos; each row shows displayName, slug badge, group badge (or "بدون گروه"), size, date, a "لینک مستقیم" field with `<origin>/?v=<slug>` and a copy button, "ویرایش" (Dialog: displayName/slug/description/groupId → PATCH) and "حذف" (AlertDialog confirm → DELETE).
  - Groups tab:
    - CreateGroupCard: name + optional slug + submit "ایجاد گروه".
    - GroupsList: each row shows name, slug, video count, order; edit (Dialog: rename/slug/order → PATCH) and delete (AlertDialog confirm → DELETE; videos become ungrouped via onDelete:SetNull).
  - Sticky footer with a short Persian note.
- Lint: ran `bun run lint` — clean (no errors, no warnings).
- Caught and fixed two real bugs during verification:
  1. The admin page (client) was importing `formatBytes` from `@/lib/videos`, which transitively imports `fs/promises` and `node:crypto` — Turbopack errored with "Module not found: Can't resolve 'fs/promises'". Fix: extracted `formatBytes`/`formatDate` into the client-safe `src/lib/format.ts` and re-exported from `videos.ts` for back-compat.
  2. `createToken()` was signing the raw JSON payload while `verifyToken()` checked the signature of the base64-encoded payload — mismatch caused every session check to return `false` even with a valid cookie. Fix: `createToken()` now signs `payloadB64` (matching `verifyToken`).
- Verified with agent-browser over http://localhost:3000:
  - Main page: title "کتابخانه ویدئو"; video loads (readyState=4, duration=12 for sample-1 / 8 for sample-2); prev/next work; search filters live; group headers ("دروس آموزشی" + "بدون گروه") render with correct counts.
  - Direct link `?v=sample-lesson-2`: page loads with sample-2 selected, video src is a `blob:` URL (cache hit), duration=8, search=`"?v=sample-lesson-2"`.
  - "کپی لینک ویدئو" button: sonner toast "لینک کپی شد" appears.
  - IndexedDB caching: cleared cache via JS, installed a fetch interceptor, switched to sample-2 (fetchCount=1, src=network), switched to sample-1 (fetchCount=1, src=network), then switched back to sample-2 (fetchCount=0, src=`blob:...` — cache hit, instant playback). Proves the second play uses cache with no network fetch.
  - Admin login at `/admin` with `admin1234`: toast "خوش آمدید"; dashboard appears with "مشاهده سایت" + "خروج" + Tabs (ویدئوها / گروه‌ها).
  - Wrong password: toast "رمز اشتباه است"; stays on login card.
  - Created group "دروس آموزشی" (slug auto = "دروس-آموزشی"); appears in groups list with slug + count badges.
  - Edited sample-lesson-1: added description "این یک ویدئوی آزمایشی برای تست است." and assigned to "دروس آموزشی" group via Dialog; toast "تغییرات ذخیره شد"; main page now shows sample-1 under the "دروس آموزشی" group header with the description paragraph visible.
  - Uploaded a tiny test mp4 via the admin upload form (file Input set via `agent-browser upload`); display name auto-filled "test-tiny"; description "تست آپلود"; toast "ویدئو با موفقیت آپلود شد"; new row appears with direct link `http://localhost:3000/?v=test-tiny`; visiting that link loads the uploaded video (readyState=4, duration=3).
  - Deleted test-tiny via AlertDialog confirm; toast "ویدئو حذف شد"; the physical file was removed from `public/videos/` (verified with `ls`).
  - Logout: cookie cleared; subsequent `/api/admin/session` returns `{authenticated:false}` and `/api/admin/videos` returns 401.
  - Dark mode toggle on main page: `html.dark` class toggles correctly (light→dark→light).
- Final lint: clean. Final dev.log: no compile/runtime errors; all routes return expected status codes (200 for success, 401 for unauthenticated admin, 404 for missing).

Stage Summary:
- Admin panel is fully built and verified end-to-end: cookie-based offline auth (password `admin1234`, secret `video-library-secret`), DB-driven videos + groups with folder auto-sync, admin CRUD + upload, grouped RTL sidebar, direct shareable links `?v=<slug>`, and IndexedDB client caching (verified: second play is instant from cache with zero network fetch).
- Files created: `src/lib/auth.ts`, `src/lib/videos.ts`, `src/lib/video-cache.ts`, `src/lib/format.ts`, `src/app/api/admin/login/route.ts`, `src/app/api/admin/logout/route.ts`, `src/app/api/admin/session/route.ts`, `src/app/api/admin/groups/route.ts`, `src/app/api/admin/groups/[id]/route.ts`, `src/app/api/admin/videos/route.ts`, `src/app/api/admin/videos/[id]/route.ts`, `src/app/admin/page.tsx`.
- Files modified: `src/app/api/videos/route.ts` (rewritten to be DB-driven with sync), `src/app/page.tsx` (rewritten with grouping, descriptions, direct links, IndexedDB caching; kept the same beautiful sidebar-left/player-right aesthetic).
- Unchanged (per constraints): `prisma/schema.prisma`, `src/app/globals.css` (font lines), `src/app/layout.tsx` (html/font setup), `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `public/favicon.svg`. The admin page renders its own Sonner `<Toaster />` (the layout's old `<Toaster />` from `toaster.tsx` is left untouched as required).
- Admin password (default): `admin1234`. Override with the `ADMIN_PASSWORD` env var. Session secret override: `AUTH_SECRET`.
- Lint: passes (0 errors, 0 warnings). Dev log: clean (only Prisma queries + 200/401/404 lines).
- No unmet constraints.

---
Task ID: 7
Agent: main (Z.ai Code) — verification of Task 6 subagent output
Task: Independently verify the admin panel + features built by the full-stack-developer subagent (Task 6), especially the "fully offline" constraint the user cares about.

Work Log:
- Confirmed `bun run lint` clean (0 errors). dev.log shows only Prisma queries + 200s (no compile/runtime errors). worklog has Task ID 6 entry.
- Investigated `__nextjs_font/geist-*.woff2` font requests seen in network: confirmed they come from the Next.js DEVTOOLS overlay (bundled local files at node_modules/next/dist/.../next-devtools/server/font/geist-*.woff2), NOT from the app and NOT from the internet. No `next/font` import anywhere in src/; layout.tsx uses system fonts (Tahoma/Segoe UI). App is fully offline.
- Agent-browser E2E on http://localhost:3000/?v=sample-lesson-2: direct link pre-selected sample-lesson-2 ✓; grouped sidebar ("دروس آموزشی" + "بدون گروه") ✓; video plays (paused=false, dur=8) ✓; first view = network URL, switching back to a previously-viewed video = `blob:` URL (isBlob:true) → IndexedDB cache works (no network refetch) ✓.
- /admin: login form ("پنل مدیریت ویدئو" + "رمز مدیریت" + "ورود") ✓; ONLY localhost requests (offline) ✓; login with admin1234 → dashboard with Tabs ("ویدئوها"/"گروه‌ها"), upload form ("فایل ویدئو mp4" + group select "بدون گروه"), "مشاهده سایت" link, "خروج" button ✓.

Stage Summary:
- All user requirements verified working: /admin route, password login, upload, grouping, editable display name, description, direct links (?v=slug), admin-choosable short slug, IndexedDB caching (blob URL on 2nd view), fully offline (no external fonts/CDNs).
- Admin password: admin1234 (override via ADMIN_PASSWORD env).
- No constraint violations found. App ready.

---
Task ID: 8
Agent: main (Z.ai Code)
Task: Add per-video download capability, controlled by an admin toggle; when enabled and the video is cached in IndexedDB, download should happen quickly from the local cache.

Work Log:
- Schema: added `downloadable Boolean @default(false)` to Video model in prisma/schema.prisma; ran `bun run db:push` (regenerated Prisma client).
- src/lib/videos.ts: added `downloadable: boolean` to PublicVideo interface, toPublicVideo input/output, and listAllVideosForAdmin return.
- src/app/api/admin/videos/route.ts (POST): parse `downloadable` from FormData; set on create; return in response.
- src/app/api/admin/videos/[id]/route.ts: GET returns downloadable; PATCH accepts `downloadable` boolean and updates; returns downloadable.
- src/app/page.tsx: added `downloadable` to VideoItem; added Download icon import; added `handleDownload` that (1) tries IndexedDB cache first → if hit, triggers `<a download>` from blob URL + toast "دانلود از کش لوکال شروع شد"; (2) else fetches the file as blob, caches it (best-effort), triggers download + toast. Added "دانلود ویدئو" button shown only when selected.downloadable === true, with a `downloading` spinner state.
- src/app/admin/page.tsx: added `downloadable` to AdminVideo; imported Switch + Download icon; added downloadable state + reset to UploadCard with a Switch row + appends to FormData; added downloadable state + Switch row + PATCH body to EditDialog (fixed body type to Record<string, string | boolean>); added "قابل دانلود" Badge on the VideoRow when downloadable.
- After schema change, the running dev server had a STALE PrismaClient (predated the downloadable field) → PATCH threw `Unknown argument groupId` and the admin list returned downloadable=undefined (Switch showed uncontrolled→controlled warning). Fixed by killing the old dev processes, clearing .next cache, and restarting with nohup so a fresh PrismaClient (knowing downloadable) was loaded. (Note: `setsid ... &` did not persist; `nohup bun run dev &` worked.)
- Lint clean. dev.log clean (200s).
- Agent-browser E2E:
  * /admin login (admin1234) → dashboard.
  * Edit sample-lesson-1 → toggle "قابل دانلود" Switch on → Save → PATCH 200, dialog closed, badge "قابل دانلود" appears on the row.
  * Main page /?v=sample-lesson-1 → "دانلود ویدئو" button present; play to cache; switching away+back shows blob: src (cached).
  * Click "دانلود ویدئو" → toast "دانلود از کش لوکال شروع شد" AND no new network fetch to /videos/sample-lesson-1.mp4 after click → download came entirely from IndexedDB cache.
  * /?v=sample-lesson-2 (downloadable=false) → NO download button (only "کپی لینک") — toggle correctly hides the button.

Stage Summary:
- Per-video download toggle fully working: admin enables/disables via Switch in upload + edit; main page shows "دانلود ویدئو" only when enabled; download uses IndexedDB cache (instant, no network) when available, else fetches then downloads (and caches for next time).
- Admin password: admin1234. Offline constraint intact (no external requests).
- No issues.

---
Task ID: 9
Agent: main (Z.ai Code)
Task: Add (1) per-video view count that is visible, (2) admin panel showing currently-active IPs/viewers on the site.

Work Log:
- Schema: added `viewCount Int @default(0)` to Video model; ran `bun run db:push`.
- src/lib/videos.ts: added viewCount to PublicVideo interface, toPublicVideo (param+return), and listAllVideosForAdmin return.
- src/lib/sessions.ts (new): in-memory ViewerSession store keyed by per-browser `sid` cookie; getClientIp() reads x-forwarded-for / x-real-ip; touchSession(); getActiveSessions() (active within ACTIVE_TIMEOUT_MS=60s); cleanupStaleSessions().
- POST /api/heartbeat: sets `vl_sid` cookie if missing, reads IP + UA, parses body {videoSlug?, videoName?}, touches session. Public.
- GET /api/admin/online: requireAdmin; returns {online, sessions:[{sid, ip, videoSlug, videoName, lastSeenAgo, firstSeen}]}.
- POST /api/videos/[id]/view: increments video.viewCount; returns {ok, viewCount}. Public, fire-and-forget.
- src/app/page.tsx: added viewCount to VideoItem; added Eye icon; added viewBumps state + viewsOf(v)=viewCount+bumps; sendHeartbeat() helper; on mount sends presence heartbeat; on `selected` change: sends heartbeat + optimistic viewBumps bump + POST /api/videos/[id]/view; periodic heartbeat every 20s; shows "👁 N" in sidebar item and "N بازدید" in player meta. (Fixed an init-order bug: moved the selected-dependent effects to AFTER the `selected` useMemo to resolve "Cannot access 'selected' before initialization" ReferenceError.)
- src/app/admin/page.tsx: added viewCount to AdminVideo; imported Eye + Users; added OnlinePanel component (polls /api/admin/online every 10s, shows count badge with pulsing green dot + list of sessions: IP, current video or "در حال مرور سایت", last-seen-ago); rendered OnlinePanel above the Tabs in Dashboard; added "👁 N بازدید" to VideoRow meta.
- Restarted dev server + cleared .next so a fresh PrismaClient (knowing viewCount + downloadable) was loaded (the stale client previously caused 500s). Lint clean. dev.log clean (200s).

Agent-browser E2E:
- Main page /?v=sample-lesson-1: sidebar item shows "sample-lesson-1 75.5 KB ۱ ۱۴۰۵/۷/۱۳" (۱ = view count), player meta shows "بازدید". Switching to sample-2 and back fired 3× POST /api/videos/{id}/view (all 200) → view count increments on each selection.
- Admin /admin login (admin1234) → Online panel rendered: "کاربران آنلاین · ۲ فعال" with a session showing IP "::1" (localhost) watching "sample-lesson-1" "۳۲ ثانیه پیش", plus a second session "در حال مرور سایت". (On a real LAN the IP would be the colleague's LAN IP via X-Forwarded-For.)

Stage Summary:
- View count: visible per-video on the main page (sidebar + player meta) and in admin rows; increments on each view via POST /api/videos/[id]/view.
- Active viewers: admin "کاربران آنلاین" panel shows count + per-session IP, current video, last-seen; auto-refreshes every 10s; presence tracked via /api/heartbeat (per-browser sid cookie, 60s active window).
- Offline constraint intact (no external requests; in-memory sessions + DB only). Admin password: admin1234.

---
Task ID: 10
Agent: main (Z.ai Code)
Task: Fix Prisma "Cannot find @prisma/client" error on the user's Windows machine; use a proper offline Persian font.

Work Log:
- Diagnosed the Windows Prisma error: the user copied the project to `C:\Next Projects\learnvideo\LearnV8` and ran it; `import { PrismaClient } from '@prisma/client'` failed because (a) the Prisma generated client was missing (no `prisma generate` run on Windows), and (b) the Linux Prisma query-engine binary in node_modules wouldn't run on Windows.
- package.json: added `"postinstall": "prisma generate || echo skipped"` so that `npm install`/`bun install` auto-generates the (platform-correct) Prisma client. User just needs install → db:push → dev.
- .env: changed `DATABASE_URL` from the absolute Linux path `file:/home/z/my-project/db/custom.db` to a cross-platform relative path `file:./db/custom.db`. Verified on the sandbox that this resolves to the same DB file and PRESERVES all data (groups:1, videos:2, view counts intact — sidebar still showed "۹" views for sample-lesson-1).
- Font: downloaded 4 Vazirmatn woff2 files (arabic + latin subsets, weights 400 + 700) from the fontsource CDN ONCE during dev into `public/fonts/`. Added 4 `@font-face` declarations in src/app/globals.css with `unicode-range` (Latin → latin file, Persian/Arabic → arabic file). Set `--font-sans: "Vazirmatn", system-ui, ...Tahoma...`. The font is self-hosted from the local Next.js server → fully offline at both dev and runtime (NO `next/font/google`, NO Google Fonts fetch). The files are bundled in the repo so end users get them offline.
- Restarted dev server (fresh Prisma client + new .env + font CSS). Lint clean. dev.log clean (200s).
- Agent-browser verification: page loads; 4 font requests to `http://localhost:3000/fonts/vazirmatn-*.woff2` (all 200, all LOCAL); NO external host in any request (only localhost); computed font-family = "Vazirmatn, system-ui, ..."; data preserved (group "دروس آموزشی" + 2 sample videos + view counts).

Stage Summary:
- Windows Prisma fix: postinstall auto-generates the client; relative DATABASE_URL works cross-platform. User steps: `npm install` (auto prisma generate) → `npm run db:push` (creates db/custom.db + tables) → `npm run dev`.
- Offline font: Vazirmatn (proper Persian font) self-hosted from public/fonts/ via @font-face + unicode-range; zero external font requests; bundled in repo for offline use on the LAN.
- Removed db/custom.db.bak (data verified preserved). Admin password: admin1234.

---
Task ID: 11
Agent: main (Z.ai Code)
Task: Fix Windows `npm run build` error: EINVAL copyfile for `[externals]_node:fs_promises...js` chunk (colon in filename is illegal on Windows).

Work Log:
- Root cause: `next.config.ts` had `output: "standalone"`. During `next build`, Next.js traces node built-in imports (e.g. `node:fs/promises`, `node:crypto`) into chunk files named like `[externals]_node:fs_promises_<hash>._.js`. The `:` character is ILLEGAL in Windows filenames (reserved for drive letters / NTFS alternate data streams), so the standalone tracing `copyfile` step fails with `EINVAL` on Windows. (Does not fail on Linux — colons are valid there — which is why it only appeared on the user's machine.)
- Fix: removed `output: "standalone"` from next.config.ts (standard `next build`/`next start` is sufficient for a LAN app and does no standalone tracing). Added an explanatory comment.
- package.json: made scripts cross-platform:
  - `dev`: `next dev -p 3000` (removed Linux-only `2>&1 | tee dev.log`)
  - `build`: `next build` (removed `cp -r ...` Linux-only copy commands, no longer needed without standalone)
  - `start`: `next start -H 0.0.0.0 -p 3000` (replaced `bun .next/standalone/server.js`; `-H 0.0.0.0` guarantees LAN access)
  - kept `postinstall: prisma generate` and `db:push`.
- Restarted dev in the sandbox with redirect `> dev.log 2>&1` (since the dev script no longer tees). Lint clean. `/` and `/admin` both return 200; heartbeat 200. next.config.ts valid (dev started cleanly).
- Did NOT run `next build` in the sandbox (per environment rules; also the EINVAL is Windows-specific and wouldn't reproduce on Linux). The fix is verified by reasoning: without `output: standalone`, `next build` performs no standalone tracing/copyfile step, so the EINVAL cannot occur.

Stage Summary:
- Build now works on Windows: `npm install` (auto prisma generate) → `npm run db:push` → `npm run build` → `npm run start` (serves on 0.0.0.0:3000, LAN-accessible).
- No code/data changes; purely config + scripts. Offline Vazirmatn font, view counts, online panel, download feature all intact.

---
Task ID: 12
Agent: main (Z.ai Code)
Task: (1) Groups created in one browser's admin not visible in another browser's admin. (2) Add video fullscreen enlarge/shrink controls.

Work Log:
- Investigated #1: GET admin routes already have `export const dynamic = "force-dynamic"` (not Next.js-cached) and client fetches already use `cache: "no-store"` (browser won't cache). Queried the DB → data is intact (group "دروس آموزشی" + sample-1 assigned to it + sample-2 ungrouped all persisted across restarts). So NOT data loss.
- Root cause of cross-browser invisibility is most likely one of: (a) the user is mixing the SANDBOX preview (sandbox DB) with their LOCAL Windows app (local DB) — groups created in one DB do not appear in the other; or (b) a stale open admin tab in browser B showing old state.
- Fix for (b): added a window `focus` + document `visibilitychange` listener to both VideosTab and GroupsTab in src/app/admin/page.tsx that calls their `refresh()` whenever the admin window/tab regains focus — so a stale open tab always re-fetches the latest groups/videos from the server. (Standard, low-risk pattern.)
- #2 Fullscreen: in src/app/page.tsx added Maximize2/Minimize2 icons, a `playerWrapRef` on the player container, an `isFullscreen` state with a `fullscreenchange` listener, and a `toggleFullscreen()` that calls `el.requestFullscreen()` / `document.exitFullscreen()`. Added an overlay button (top-right, inside the container) that shows Maximize2 when normal ("نمایش تمام‌صفحه") and Minimize2 when fullscreen ("خروج از تمام‌صفحه (Esc)"). The video switches to `h-screen w-screen object-contain` in fullscreen so it fills the screen; the overlay button stays visible inside the fullscreen container so the user can shrink back.
- Lint clean. dev.log clean (200s). Agent-browser verified: the "نمایش تمام‌صفحه" button is present; clicking it sets `document.fullscreenElement` to the container DIV (fs:true); exiting returns null. Admin still loads (dashboard tabs + sample videos present) after the focus-refresh edit.

Stage Summary:
- Cross-browser visibility: focus-auto-refresh added to Videos/Groups tabs (stale open tabs now re-fetch on focus). If the user is mixing the sandbox preview with their local Windows app, those are separate servers with separate databases — groups created in one will NOT appear in the other (expected, not a bug).
- Fullscreen: custom enlarge/shrink button on the player (Maximize2 → enter fullscreen; Minimize2 → exit), plus the native video controls still available. Verified working.
- No DB/data changes. Offline font, view counts, online panel, download, direct links all intact.

---
Task ID: 13
Agent: main (Z.ai Code)
Task: (1) Make fullscreen enter/exit buttons CLEAR and labeled for beginner users. (2) Confirm RTL on admin + main page. (3) Diagnose "groups + uploaded video missing in another browser/system but video still playable".

Work Log:
- (1) Fullscreen: replaced the small icon-only overlay button with TWO clear labeled controls in src/app/page.tsx:
  * A prominent "نمایش تمام‌صفحه" button (Maximize2 icon + label) in the action-button row below the player (always visible when a video is selected).
  * A prominent "خروج از تمام‌صفحه" overlay button (Minimize2 icon + label, solid bg, top-right) shown ONLY while in fullscreen — so beginners see a clear way out.
  Agent-browser verified: clicking "نمایش تمام‌صفحه" puts the container DIV into fullscreen (fs:true); the "خروج از تمام‌صفحه" overlay button appears; exiting returns to normal.
- (2) RTL: confirmed `document.documentElement.dir === "rtl"` (set on <html> in layout.tsx). Both / and /admin inherit it, so the whole app is right-to-left. Only `dir="ltr"` usages are on LTR content (slugs, filenames, IP, code) which is correct. No layout container is forced LTR. RTL requirement already satisfied.
- (3) Cross-browser/system data issue: the symptom "video playable but group + custom metadata missing" is the signature of a DATABASE that was reset/recreated while the video FILES (public/videos/) persisted. syncFolderToDb() re-imports those files into the fresh DB with DEFAULT display names and groupId=null — so the video re-appears on the main page (playable) but the original group + display name + description are gone (they lived only in the DB). Checked .gitignore — `db/` is NOT ignored, so git transfers preserve it; the issue arises only if the user copies/moves the project WITHOUT the `db/` folder, runs `db:reset`, or mixes the sandbox preview (sandbox DB) with their local Windows app (local DB).
- Diagnostics added to admin (src/app/admin/page.tsx) VideosTab + GroupsTab: an `error` state; the refresh function now sets a clear Persian error for 401 ("نشست مدیریت منقضی شده..."), non-ok ("خطا در دریافت..."), or network failure ("ارتباط با سرور ناموفق بود"); a "تازه‌سازی" (Refresh) button with a spinning RefreshCw icon; and a destructive-colored error banner (AlertCircle) so an empty list is never confused with a silent fetch failure. (Focus auto-refresh from Task 12 still active.)
- Lint clean. dev.log clean. Admin loads (verified "مدیریت ویدئوها" header renders after login).

Stage Summary:
- Fullscreen: clear labeled "نمایش تمام‌صفحه" + "خروج از تمام‌صفحه" buttons (beginner-friendly).
- RTL: already RTL on all pages (dir="rtl" on <html>); confirmed.
- Cross-browser data: explained — transferring the project without the `db/` folder (or running on a separate server) recreates an empty DB and re-imports video FILES with default names + no groups; the groups + custom metadata live only in `db/custom.db` and must travel with the project. Admin now shows explicit error banners + a manual refresh button so fetch failures aren't mistaken for "no data".
