// Applies a chosen light/dark theme before first paint (see src/lib/theme.ts).
// A file rather than an inline script so the Content-Security-Policy can stay strict.
try {
  var t = localStorage.getItem('soon-theme')
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
} catch (e) {}
