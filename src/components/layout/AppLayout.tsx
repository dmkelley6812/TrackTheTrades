import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { ProgressionProvider } from '../../contexts/ProgressionContext'

export default function AppLayout() {
  return (
    <ProgressionProvider><div className="min-h-screen bg-deep flex">
      <Sidebar />
      <main className="flex-1 ml-56 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div></ProgressionProvider>
  )
}
