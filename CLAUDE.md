# soon: personal task manager PWA

## What this is
A local-first task manager that installs from the browser on iPhone and Android.
No backend, no accounts, no analytics. All task data lives in IndexedDB on the
user's device and only leaves it when the user exports a backup. The built app is
static files, hosted later on Cloudflare (Workers static assets).

Design spec: `DESIGN.md`. Read it before building or changing any UI.

## Stack
- React + TypeScript + Vite
- Tailwind CSS, with the design tokens from `DESIGN.md`
- Dexie + dexie-react-hooks for IndexedDB. Use `useLiveQuery` instead of a state library
- vite-plugin-pwa (Workbox), `registerType: 'prompt'`
- Vitest + fake-indexeddb for unit tests, Playwright for end-to-end tests (Chromium, WebKit, mobile viewports)
- Font: Bricolage Grotesque, self-hosted from an npm package. No Google Fonts at runtime
- No router, state library or UI kit unless we agree to add one

## Commands
- `npm run dev`: Vite dev server on http://localhost:3000
- `npm run build`: typecheck (`tsc -b`), then production build to `dist/`
- `npm run preview`: serve the production build on http://localhost:3000
- `npm run build:e2e`: production build in `e2e` mode to `dist-e2e/`. Same as `build`, but it also accepts `?seed`. Playwright uses it
- `npm run typecheck`: TypeScript only, no output
- `npm run lint`: ESLint
- `npm run format` / `npm run format:check`: Prettier (Markdown files are ignored)
- `npm test`: Vitest unit tests, run once (`npm run test:watch` for watch mode)
- `npm run deploy`: production build, then `wrangler deploy` to Cloudflare Workers static assets (`wrangler.jsonc`). Live at https://soon.yunnna.workers.dev (Worker `soon`, account subdomain `yunnna`). Changing either name changes the address, and installed apps keep their data per address. Needs `npx wrangler login` once on this machine. Ask before running it
- Local Cloudflare check: `npm run build && npx wrangler dev --port 8787 --ip 127.0.0.1` serves `dist/` with the real `_headers`, no account needed
- `npm run icons`: redraw the app icons (`scripts/make-icons.mjs`, rendered with Playwright) into `public/`. Output is committed
- Sample data: open http://localhost:3000/?seed in dev to replace all data with the sample set in `src/db/seed.ts`. Production builds leave this out
- `npm run test:e2e`: Playwright (Chromium, WebKit, Pixel 7, iPhone 15). Builds and serves the app on port 3000 itself (reuses a server already running there). First time on a new machine: `npx playwright install --with-deps chromium webkit`

Pinned TypeScript to ~6.0 because typescript-eslint doesn't support 7 yet.

## Structure
```
src/
  db/          schema.ts, tasks.ts, folders.ts, settings.ts, backup.ts  (the only code that touches Dexie)
  lib/         dates.ts (urgency and due-soon logic), ids.ts
  screens/     Home, Calendar, Folder, Task, Settings, DesktopLanding
  components/  DueCard, FolderTile, AddBar, Sheet, Toast, ProgressBar, ...
  pwa/         service worker registration, install hint, storage persistence
tests/e2e/
```

## Data model
- **Folder**: `id` (uuid), `name`, `color` (one of the folder colour names), `createdAt`, `updatedAt`
- **Task**: `id` (uuid), `title`, `notes`, `folderId` (null = Unsorted), `dueDate` ("YYYY-MM-DD" or null), `dueTime` ("HH:mm" or null, only allowed with a dueDate), `steps` (`{id, title, done}[]`), `completedAt` (ISO string or null), `createdAt`, `updatedAt`
- **Settings** (key/value): `dueSoonDays` (1–7, default 3), `theme` (system | light | dark), `startView` (list | calendar, default list), `lastBackupAt`, `installHintDismissed`
- Store dates as local date and time strings, not timestamps, so "due today" never shifts with time zones.
- Keep `createdAt`/`updatedAt` on everything so sync could be added later.

## Agreed behaviour
- **Home**: date header, then "Due soon", then folders.
  - Due soon = overdue tasks plus tasks due within `dueSoonDays`. The window includes its last day: with 3, a task due today + 3 is in, today + 4 is not.
  - Sort overdue first, then by date. On the same day, timed tasks come first in time order, then untimed ones.
  - Show up to 5, with a "See all N" button that expands the list in place. Once expanded it reads "Show fewer".
  - The summary line is hidden when nothing is due; the empty Due soon card says "Nothing due in the next N days."
  - The dashed "New folder" tile always ends the folder grid, not only on first run.
  - The add bar reads "Add your first task" until any task exists (completed ones count).
- **Calendar** (v2): Home's second view, a week grid like a desk calendar, at `#/calendar` (this week) or `#/calendar/<YYYY-MM-DD>` (the week of that date). (An agenda list was tried first and rejected by the owner: it looked like the task list.)
  - Header: wordmark, a List / Calendar switch (two 44px icon buttons in a white pill, the active one ink), Settings. The switch replaces the route instead of pushing it, so the back gesture doesn't flip between views. The list view has the same header.
  - Settings has "First page: List / Calendar" (`startView`). `#/` waits for settings to load before showing that view, so the other one never flashes.
  - Title is the week ("26 Oct – 1 Nov", with years when the week isn't all in this year), with previous and next week buttons, then "This week" or a "Back to this week" button. Weeks start on Monday. Changing week replaces the route, so Back from a task returns to the same week.
  - The grid scrolls both ways inside the screen: day columns (weekday, day, month) stay on top, the hours column stays on the left. Day columns are at least 116px, so about three fit on a phone and the rest scroll in from the right; on wider screens the week fills the width. A new week opens scrolled to today's column, at the top.
  - Below the day headers is an "Any time" row: untimed tasks as folder-coloured entries, then a dashed + to add a task on that day. Under it, hour rows from 07:00 (earlier if a task that week is earlier) to midnight, 56px each.
  - Timed tasks are 46px folder-coloured entries at their time, showing the time and title. Tasks have no length, so an entry that would overlap the one before is pushed down below it (`src/lib/weekGrid.ts`). Overdue tasks carry a coral "Late" / "Late · 09:00" pill. Today's header is amber and a coral line marks the current time.
  - Tapping an entry opens the task. Tapping an empty hour opens Quick add with that day and hour; keyboard and screen reader users add with the + under Any time instead. Tapping a day header opens a sheet listing that day's tasks with ticks and an "Add task" button. Ticking there closes the sheet first, because the Undo toast sits under open sheets.
  - Open tasks only; completed and undated tasks aren't shown.
  - The iPhone install hint shows here too, so it isn't missed when the calendar is the first page.
- **Urgency colours**: late = coral, today = amber, tomorrow = yellow, later = lilac.
  - A task with a time is overdue once the time passes (due 17:00 is late from 17:01). One without a time is overdue from the next day.
  - Urgency tab labels (big / small):
    - The big line is the time if there is one, otherwise the weekday: "17:00" / "today", "Fri" / "tomorrow", "Sat" / "31 Oct".
    - Late by whole days shows "1 day" or "2 days" / "late". Late earlier today shows the time, e.g. "09:00" / "late".
- **Folders**: one level, no nesting. Each folder has a colour.
  - "Unsorted" is the built-in default folder and acts as the inbox. It can't be renamed or deleted.
  - Progress = done / total. At 100%, show an "All done" tick.
  - Deleting a folder moves its tasks to Unsorted.
  - Folder names are 1–40 characters after trimming.
  - New folders default to the first colour not yet used by another folder.
  - Folder screen lists open tasks only: "With a due date" in due order, then "No date" oldest first. Ties go by creation time, then title.
  - Deleting needs confirmation; "Keep folder" gets focus. Completed tasks in the folder move to Unsorted too.
- **Navigation**: hash routes, no router library (`src/lib/route.ts`): `#/` (Home in the `startView` view), `#/list`, `#/calendar`, `#/folder/unsorted`, `#/folder/<id>`, `#/task/<id>`, `#/settings`, `#/completed`. Screens open as history entries, so the phone's back gesture works. The Back button goes Home when the app was opened straight onto a folder.
- **Completed folder**: a "Completed" row under Unsorted on Home, only while any task is completed. It opens `#/completed`: completed tasks from every folder, newest first, each with its folder. Tapping a tick reopens the task. "Delete all" asks first ("Keep them" focused), deletes them all in one transaction, goes back, and shows an Undo toast for the whole batch; the row then hides until something is completed again.
- **Completed tasks**: hidden from lists. Each folder has a "Show completed (N)" toggle. It only appears when N > 0, and resets when you leave the folder. The Completed list is newest first; tapping a filled tick reopens the task (no toast).
- **Undo**: completing or deleting a task shows a toast with Undo, for about 5 seconds. One toast at a time; a new one replaces the old. It pauses while pointed at or focused, so keyboard and screen reader users can reach Undo. Toasts live outside the screens (`src/lib/toast.ts`), so deleting on the Task page shows its toast on the screen you go back to. Screens complete and delete through `src/lib/taskActions.ts`, not the db functions directly. If the task's folder was deleted before Undo, the task comes back in Unsorted.
- **Task page**: title, date, optional time, folder, notes, steps checklist with progress, created and last edited dates, delete. Changes save as you type.
  - Title, notes and step names save 300ms after typing stops, and straight away on blur or leaving the page. Date, time, folder, ticks and new steps save on each change. A "Saving… / Saved" status sits top right.
  - An emptied title or step name is never saved; on blur it goes back to the last saved text. Titles are one line (Enter finishes editing).
  - Date, time and folder use native inputs and a select. Removing the date also removes the time.
  - "Mark as done" keeps you on the page and becomes "Mark as not done". Deleting goes back to the previous screen.
- **Opening tasks**: a Due soon card opens its task from anywhere except the tick circle; a folder row the same.
- **Quick add**: opens from the bottom add bar. Pick the folder and date with chips, time is optional. The sheet stays open after adding, so several tasks can be added in a row. Inside a folder, new tasks go to that folder.
  - Starts on Unsorted (or the current folder) and "No date". After each add the title clears and the folder, date and time stay, for adding a batch.
  - When chips: No date, Today, Tomorrow, then "Pick date" for the native date picker. "Pick date" is a transparent date input laid over a chip, so the tap opens the calendar directly (iOS ignores `showPicker()` on a hidden input). It shows the picked date ("Mon 9 Nov"); picking today or tomorrow selects that chip instead. "Add time" appears only once a date is picked.
  - Closes with the close button, Escape, or a tap on the dimmed background.
- **Sheets** use the native `<dialog>` (`src/components/Sheet.tsx`). Open them from a tap with `flushSync` and mark the field to focus with `data-autofocus`, so the iPhone keyboard comes up. Confirmations use the same component with `centered`.
- **Chips** are 44px tall, not DESIGN.md's 40px, to meet the touch target rule.
- **No reminders or notifications in v1.** The time is display only.
- **Backup**:
  - Export writes a versioned JSON file.
  - Import validates everything first, then replaces all data in one transaction, or changes nothing.
  - No backup nudge on Home (removed at the owner's request, 2026-10-29). Settings' backup card turns amber when the last backup is more than 14 days old (or there's never been one) and tasks exist.
  - The file holds folders, tasks, `dueSoonDays`, `theme` and `startView`. It's still file version 1: older files without `startView` import as `list`, and 1.x apps drop the unknown field. `lastBackupAt` and `installHintDismissed` stay per device and are never replaced by an import.
  - Unknown fields are dropped. Anything missing or malformed rejects the whole file with a reason ("That backup is damaged: Task 3 has a bad due date. Nothing on this phone was changed."). A newer file version asks you to update the app.
  - Import always asks first ("Replace everything?", Cancel focused), since it replaces everything.
  - Export uses the share sheet where it can share files (phones), otherwise a download. `lastBackupAt` is only set when the save wasn't cancelled.
- **Storage**: call `navigator.storage.persist()` on start-up (`src/pwa/storage.ts`, from `main.tsx`). Settings shows whether storage is protected.
- **Theme**: `data-theme` on `<html>`, removed for System. Also mirrored to `localStorage` (`soon-theme`) so the inline script in `index.html` applies it before the first paint.
- **iPhone install hint**: shown once in Safari before installing. Warns that tasks added in a Safari tab don't move to the installed app.
  - Safari on iPhone/iPad only (not Chrome, Firefox or in-app browsers on iOS), never once installed. Shown on Home until dismissed, then `installHintDismissed` keeps it away.
- **Service worker** (vite-plugin-pwa, `registerType: 'prompt'`): precaches the whole build, fonts included. Registered once from `main.tsx` through `src/pwa/updates.ts`, which holds the update state so the banner and Settings share it.
  - A waiting update shows the cobalt "A new version of soon is ready / Reload" banner.
  - The app checks for a new version at start-up, hourly while open, and when it comes back to the foreground (at most every 5 minutes), since iPhone apps resume rather than relaunch.
  - Settings has an Updates card with "Check for updates": it reports "You have the latest version", "A new version is ready" (the button becomes Reload), or "Couldn't check for updates". Without a service worker (old browsers, the dev server) it says it can't check and offers a plain Reload.
- **Icons**: four stacked bars in the urgency colours on ink. `any` icons have rounded corners; the maskable and Apple icons are full bleed.
- **Desktop**: on wide screens, when not running as an installed app, show DesktopLanding with the version, a QR code, install steps, and a "Try it in this browser" link. On phones, show the app straight away.
  - "Desktop" means `(min-width: 900px) and (hover: hover) and (pointer: fine)`, so tablets get the app. "Try it in this browser" is remembered in `localStorage`.
  - The QR code (uqr) encodes the current origin, so it is right wherever the app is hosted.
  - e2e desktop projects start with that choice made (`tests/e2e/state.ts`); landing tests clear it.
- **Version** comes from `package.json` at build time.
- **Hosting headers** (`public/_headers`): `/`, `index.html`, `sw.js`, `manifest.webmanifest` and `theme-init.js` are `no-cache` so updates reach installed apps; `/assets/*` is immutable. A strict CSP allows only this site (`script-src 'self'`, so no inline scripts; `style-src` keeps `'unsafe-inline'` for React style attributes).
- **Device testing**: `docs/iphone-testing.md` is the checklist for a real iPhone. Version 1.0.0 passed it on a real iPhone on 2026-10-29 (reported by the owner), except steps 35–36 (update banner), which need a second deploy. Re-run it after changes to sheets, pickers, the service worker or backup.

## How to work
- One milestone at a time, in small testable steps. Stop and summarise when a milestone is done.
- Read the existing code before changing it. Don't refactor unrelated code.
- Components never call Dexie directly. Go through `src/db`.
- Keep urgency and date logic in `src/lib/dates.ts`, fully unit-tested, including edge cases around midnight.
- Ask before adding any dependency, and say why it's needed.
- Ask before anything that costs money or creates external resources (accounts, deploys, domains).
- After each change run typecheck, lint and unit tests. Run e2e tests when a user flow changes. Report the real results.
- Don't claim offline or iOS behaviour works unless it has been checked.
- Accessibility:
  - Use real buttons and links, and label every input.
  - Touch targets at least 44px, visible focus, 4.5:1 text contrast.
  - Respect `prefers-reduced-motion`.
- Never send task data anywhere. No analytics, no third-party scripts at runtime.
- Never put secrets in the project. Keep `.env*` in `.gitignore` in case Git is added later.
- Git is not installed on this Mac, and the Xcode command line tools are deliberately not installed. Don't run git commands or try to install Git, Homebrew or the command line tools. Only use npm packages that ship prebuilt binaries and don't need compiling.
- Deploy later with `npx wrangler` (direct upload to Cloudflare, no Git needed).

## Milestones
0. Scaffold: Vite + React + TS, Tailwind with tokens, font, ESLint/Prettier, Vitest, Playwright, folder structure
1. Data layer: Dexie schema, db functions, date/urgency logic, unit tests
2. Home screen: Due soon cards, folder tiles, add bar, using real data
3. Quick add sheet
4. Folder screen, plus create, rename, recolour and delete folders
5. Task page: steps, date, time, notes
6. Complete, undo and delete toasts, and "Show completed"
7. Settings: due-soon days, theme, export and import with validation, backup nudge
8. PWA: manifest, icons, service worker, update prompt, storage persistence, iPhone install hint, DesktopLanding
9. Real-device testing on iPhone, then deploy to Cloudflare

### Version 2
10. Calendar view, and a setting for which view the app opens on
