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
- Sample data: open http://localhost:3000/?seed in dev to replace all data with the sample set in `src/db/seed.ts`. Production builds leave this out
- `npm run test:e2e`: Playwright (Chromium, WebKit, Pixel 7, iPhone 15). Builds and serves the app on port 3000 itself (reuses a server already running there). First time on a new machine: `npx playwright install --with-deps chromium webkit`

Pinned TypeScript to ~6.0 because typescript-eslint doesn't support 7 yet.

## Structure
```
src/
  db/          schema.ts, tasks.ts, folders.ts, settings.ts, backup.ts  (the only code that touches Dexie)
  lib/         dates.ts (urgency and due-soon logic), ids.ts
  screens/     Home, Folder, Task, Settings, DesktopLanding
  components/  DueCard, FolderTile, AddBar, Sheet, Toast, ProgressBar, ...
  pwa/         service worker registration, install hint, storage persistence
tests/e2e/
```

## Data model
- **Folder**: `id` (uuid), `name`, `color` (one of the folder colour names), `createdAt`, `updatedAt`
- **Task**: `id` (uuid), `title`, `notes`, `folderId` (null = Unsorted), `dueDate` ("YYYY-MM-DD" or null), `dueTime` ("HH:mm" or null, only allowed with a dueDate), `steps` (`{id, title, done}[]`), `completedAt` (ISO string or null), `createdAt`, `updatedAt`
- **Settings** (key/value): `dueSoonDays` (1–7, default 3), `theme` (system | light | dark), `lastBackupAt`, `installHintDismissed`
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
- **Completed tasks**: hidden from lists. Each folder has a "Show completed (N)" toggle.
- **Undo**: completing or deleting a task shows a toast with Undo, for about 5 seconds. If the task's folder was deleted before Undo, the task comes back in Unsorted.
- **Task page**: title, date, optional time, folder, notes, steps checklist with progress, created and last edited dates, delete. Changes save as you type.
- **Quick add**: opens from the bottom add bar. Pick the folder and date with chips, time is optional. The sheet stays open after adding, so several tasks can be added in a row. Inside a folder, new tasks go to that folder.
  - Starts on Unsorted (or the current folder) and "No date". After each add the title clears and the folder, date and time stay, for adding a batch.
  - When chips: No date, Today, Tomorrow, the next five days ("Sat 31"), then "Other date" for the native date picker. "Add time" appears only once a date is picked.
  - Closes with the close button, Escape, or a tap on the dimmed background.
- **Sheets** use the native `<dialog>` (`src/components/Sheet.tsx`). Open them from a tap with `flushSync` and mark the field to focus with `data-autofocus`, so the iPhone keyboard comes up.
- **Chips** are 44px tall, not DESIGN.md's 40px, to meet the touch target rule.
- **No reminders or notifications in v1.** The time is display only.
- **Backup**:
  - Export writes a versioned JSON file.
  - Import validates everything first, then replaces all data in one transaction, or changes nothing.
  - Home shows a nudge when the last backup is more than 14 days old (or there's never been one) and tasks exist.
- **Storage**: call `navigator.storage.persist()` on start-up. Settings shows whether storage is protected.
- **iPhone install hint**: shown once in Safari before installing. Warns that tasks added in a Safari tab don't move to the installed app.
- **Desktop**: on wide screens, when not running as an installed app, show DesktopLanding with the version, a QR code, install steps, and a "Try it in this browser" link. On phones, show the app straight away.
- **Version** comes from `package.json` at build time.

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
