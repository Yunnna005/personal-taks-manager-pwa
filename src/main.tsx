import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Dev and e2e builds only: /?seed replaces all data with sample data.
// The condition is static, so production builds drop this block and seed.ts.
if (import.meta.env.DEV || import.meta.env.MODE === 'e2e') {
  const url = new URL(location.href)
  if (url.searchParams.has('seed')) {
    const { seedSampleData } = await import('./db/seed.ts')
    await seedSampleData(new Date())
    url.searchParams.delete('seed')
    history.replaceState(null, '', url)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
