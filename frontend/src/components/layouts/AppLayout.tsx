import { useLocation, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useUIStore } from '@/store/uiStore'
import { useIsMobile } from '@/hooks/useMediaQuery'

export function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const isMobile = useIsMobile()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Background grid pattern */}
      <div className="fixed inset-0 z-0" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }} />

      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-blue-600/5 blur-[128px]" />
        <div className="absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full bg-purple-600/5 blur-[128px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-500/3 blur-[100px]" />
      </div>

      <Sidebar />
      <Header />

      <main
        className="relative z-10 pt-16 transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ marginLeft: isMobile ? 0 : sidebarOpen ? 240 : 64 }}
      >
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={false}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
