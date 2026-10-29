import { useRoute } from './lib/route.ts'
import FolderScreen from './screens/Folder.tsx'
import Home from './screens/Home.tsx'
import TaskScreen from './screens/Task.tsx'

export default function App() {
  const route = useRoute()
  if (route.name === 'folder') {
    return <FolderScreen key={route.folderId ?? 'unsorted'} folderId={route.folderId} />
  }
  if (route.name === 'task') return <TaskScreen key={route.taskId} taskId={route.taskId} />
  return <Home />
}
