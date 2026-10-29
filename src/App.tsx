import { useRoute } from './lib/route.ts'
import FolderScreen from './screens/Folder.tsx'
import Home from './screens/Home.tsx'

export default function App() {
  const route = useRoute()
  if (route.name === 'folder') {
    return <FolderScreen key={route.folderId ?? 'unsorted'} folderId={route.folderId} />
  }
  return <Home />
}
