import ToastHost from './components/ToastHost.tsx'
import { useRoute, type Route } from './lib/route.ts'
import FolderScreen from './screens/Folder.tsx'
import Home from './screens/Home.tsx'
import TaskScreen from './screens/Task.tsx'

function Screen({ route }: { route: Route }) {
  if (route.name === 'folder') {
    return <FolderScreen key={route.folderId ?? 'unsorted'} folderId={route.folderId} />
  }
  if (route.name === 'task') return <TaskScreen key={route.taskId} taskId={route.taskId} />
  return <Home />
}

export default function App() {
  const route = useRoute()
  return (
    <>
      <Screen route={route} />
      <ToastHost />
    </>
  )
}
