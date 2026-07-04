import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'
import {
  LayoutDashboard, Users, BarChart3, FileText, Webhook,
  CreditCard, Settings, Zap, ChevronLeft,
  MessageSquare, AlertTriangle, BrainCircuit, UserCog,
  Receipt, Crown,
} from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { label: 'Accounts', path: '/accounts', icon: <Users className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Users', path: '/users', icon: <UserCog className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Analytics', path: '/analytics', icon: <BarChart3 className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Templates', path: '/templates', icon: <FileText className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Webhooks', path: '/webhooks', icon: <Webhook className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Plans', path: '/plans', icon: <Receipt className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Billing', path: '/billing', icon: <CreditCard className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Billing Settings', path: '/billing-settings', icon: <Settings className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Subscriptions', path: '/admin/subscriptions', icon: <Crown className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Circuit Breakers', path: '/circuit-breakers', icon: <BrainCircuit className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Dead Letters', path: '/dead-letters', icon: <MessageSquare className="h-[18px] w-[18px]" />, adminOnly: true },
  { label: 'Fraud Flags', path: '/fraud-flags', icon: <AlertTriangle className="h-[18px] w-[18px]" />, adminOnly: true },
]

const memberNav: NavItem[] = [
  { label: 'Dashboard', path: '/member', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { label: 'Devices', path: '/member/devices', icon: <Zap className="h-[18px] w-[18px]" /> },
  { label: 'Messages', path: '/member/messages', icon: <MessageSquare className="h-[18px] w-[18px]" /> },
  { label: 'Analytics', path: '/member/analytics', icon: <BarChart3 className="h-[18px] w-[18px]" /> },
  { label: 'Templates', path: '/member/templates', icon: <FileText className="h-[18px] w-[18px]" /> },
  { label: 'Webhooks', path: '/member/webhooks', icon: <Webhook className="h-[18px] w-[18px]" /> },
  { label: 'Upgrade Plan', path: '/member/upgrade', icon: <Crown className="h-[18px] w-[18px]" /> },
]

const bottomNav: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: <Settings className="h-[18px] w-[18px]" /> },
]

const navItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const isMobile = useIsMobile()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'staff'
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const navItems = isAdmin ? adminNav : memberNav
  const isActive = (path: string) => {
    if (path === '/dashboard' || path === '/member') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  const handleNavClick = (path: string) => {
    navigate(path)
    if (isMobile) setSidebarOpen(false)
  }

  if (isMobile) {
    return (
      <>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.06] bg-[#0a0f1e]"
            >
              <SidebarContent
                navItems={navItems}
                bottomNav={bottomNav}
                isActive={isActive}
                hoveredItem={hoveredItem}
                setHoveredItem={setHoveredItem}
                onNavClick={handleNavClick}
                collapsed={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  return (
    <motion.div
      animate={{ width: sidebarOpen ? 240 : 64 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.06] bg-[#0a0f1e]"
    >
      <SidebarContent
        navItems={navItems}
        bottomNav={bottomNav}
        isActive={isActive}
        hoveredItem={hoveredItem}
        setHoveredItem={setHoveredItem}
        onNavClick={handleNavClick}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
    </motion.div>
  )
}

function SidebarContent({
  navItems,
  bottomNav,
  isActive,
  hoveredItem,
  setHoveredItem,
  onNavClick,
  collapsed,
  onToggle,
}: {
  navItems: NavItem[]
  bottomNav: NavItem[]
  isActive: (path: string) => boolean
  hoveredItem: string | null
  setHoveredItem: (v: string | null) => void
  onNavClick: (path: string) => void
  collapsed: boolean
  onToggle?: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ opacity: 0, x: -8, transition: { duration: 0.12 } }}
                className="text-sm font-bold tracking-tight text-white"
              >
                AeroXe <span className="text-gray-500">Bee</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        {onToggle && (              <button
                onClick={onToggle}
                className="rounded-xl p-1.5 text-gray-500 transition-colors hover:bg-white/[0.05] hover:text-gray-300"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="space-y-0.5">
          {navItems.map((item, index) => {
            const active = isActive(item.path)
            return (
              <motion.button
                key={item.path}
                custom={index}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                onClick={() => onNavClick(item.path)}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  />
                )}
                <span className={cn(
                  'relative z-10 shrink-0 transition-colors',
                  active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300',
                )}>
                  {item.icon}
                </span>
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
                      exit={{ opacity: 0, x: -8, transition: { duration: 0.12 } }}
                      className="relative z-10 truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {collapsed && hoveredItem === item.path && (
                    <motion.div
                      initial={{ opacity: 0, x: -4, scale: 0.96 }}
                      animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } }}
                      exit={{ opacity: 0, x: -4, scale: 0.96, transition: { duration: 0.1 } }}
                      className="absolute left-full z-50 ml-2 rounded-xl border border-white/[0.08] bg-[#0f1525] px-2.5 py-1.5 text-xs font-medium text-white shadow-xl shadow-black/30 backdrop-blur-xl"
                    >
                      {item.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <div className="space-y-0.5">
          {bottomNav.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => onNavClick(item.path)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
                )}
              >
                <span className={cn(
                  'shrink-0 transition-colors',
                  active ? 'text-blue-400' : 'text-gray-500',
                )}>
                  {item.icon}
                </span>
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
                      exit={{ opacity: 0, x: -8, transition: { duration: 0.12 } }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
