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
