import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import ToastHost from './components/ToastHost.tsx'
import type { StartView } from './db/schema.ts'
import { getSettings } from './db/settings.ts'
import { useRoute, type Route } from './lib/route.ts'
import { applyTheme } from './lib/theme.ts'
import UpdateBanner from './pwa/UpdateBanner.tsx'
import { useDesktopLanding } from './pwa/useDesktopLanding.ts'
import CalendarScreen from './screens/Calendar.tsx'
import DesktopLanding from './screens/DesktopLanding.tsx'
import FolderScreen from './screens/Folder.tsx'
import CompletedScreen from './screens/Completed.tsx'
import Home from './screens/Home.tsx'
import SettingsScreen from './screens/Settings.tsx'
import TaskScreen from './screens/Task.tsx'

function Screen({ route, startView }: { route: Route; startView: StartView | undefined }) {
  if (route.name === 'folder') {
    return <FolderScreen key={route.folderId ?? 'unsorted'} folderId={route.folderId} />
  }
  if (route.name === 'task') return <TaskScreen key={route.taskId} taskId={route.taskId} />
  if (route.name === 'settings') return <SettingsScreen />
  if (route.name === 'completed') return <CompletedScreen />
  if (route.name === 'list') return <Home />
  if (route.name === 'calendar') return <CalendarScreen week={route.week} />
  // #/ opens the view chosen in Settings; wait for it so the other one doesn't flash
  if (!startView) return null
  return startView === 'calendar' ? <CalendarScreen /> : <Home />
}

export default function App() {
  const route = useRoute()
  const settings = useLiveQuery(getSettings)
  const theme = settings?.theme
  const [showLanding, tryInBrowser] = useDesktopLanding()

  useEffect(() => {
    if (theme) applyTheme(theme)
  }, [theme])

  return (
    <>
      {showLanding ? (
        <DesktopLanding onTry={tryInBrowser} />
      ) : (
        <Screen route={route} startView={settings?.startView} />
      )}
      <ToastHost />
      <UpdateBanner />
    </>
  )
}
