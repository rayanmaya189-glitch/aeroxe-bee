import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useUIStore } from '@/store/uiStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'

export function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const isMobile = useIsMobile()

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-[#0a0e1a]">
      <Sidebar />
      <Header />
      <main
        className={cn(
          'relative z-10 pt-16 transition-all duration-300',
          isMobile ? 'ml-0' : sidebarOpen ? 'ml-64' : 'ml-16',
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
