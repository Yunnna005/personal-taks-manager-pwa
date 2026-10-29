import type { Theme } from '../db/schema.ts'

// The theme lives in IndexedDB, which loads too late to avoid a flash of the
// wrong colours. A copy in localStorage is read by the inline script in
// index.html before the first paint.
export const THEME_STORAGE_KEY = 'soon-theme'

const THEME_COLORS = { light: '#EFF0F6', dark: '#14132A' }

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme

  // Keep the browser bar in step with a forced theme
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const media = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = THEME_COLORS[theme === 'system' ? media : theme]
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private mode or storage blocked: the theme still applies once the app loads
  }
}
