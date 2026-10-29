import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import ToastHost from './components/ToastHost.tsx'
import { getSettings } from './db/settings.ts'
import { useRoute, type Route } from './lib/route.ts'
import { applyTheme } from './lib/theme.ts'
import UpdateBanner from './pwa/UpdateBanner.tsx'
import { useDesktopLanding } from './pwa/useDesktopLanding.ts'
import DesktopLanding from './screens/DesktopLanding.tsx'
import FolderScreen from './screens/Folder.tsx'
import Home from './screens/Home.tsx'
import SettingsScreen from './screens/Settings.tsx'
import TaskScreen from './screens/Task.tsx'

function Screen({ route }: { route: Route }) {
  if (route.name === 'folder') {
    return <FolderScreen key={route.folderId ?? 'unsorted'} folderId={route.folderId} />
  }
  if (route.name === 'task') return <TaskScreen key={route.taskId} taskId={route.taskId} />
  if (route.name === 'settings') return <SettingsScreen />
  return <Home />
}

export default function App() {
  const route = useRoute()
  const theme = useLiveQuery(getSettings)?.theme
  const [showLanding, tryInBrowser] = useDesktopLanding()

  useEffect(() => {
    if (theme) applyTheme(theme)
  }, [theme])

  return (
    <>
      {showLanding ? <DesktopLanding onTry={tryInBrowser} /> : <Screen route={route} />}
      <ToastHost />
      <UpdateBanner />
    </>
  )
}
