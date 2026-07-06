import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { logout } from '@/services/auth'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/utils/cn'
import { LogOut, Settings, ChevronDown, Menu, Bell, CheckCircle, XCircle, AlertTriangle, Info, Clock, Trash2 } from 'lucide-react'
import type { ToastHistoryEntry } from '@/components/ui/Toast'

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const historyIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle className="h-3.5 w-3.5" />,
  error: <XCircle className="h-3.5 w-3.5" />,
  warning: <AlertTriangle className="h-3.5 w-3.5" />,
  info: <Info className="h-3.5 w-3.5" />,
}

const historyIconStyles: Record<string, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
}

const historyBgStyles: Record<string, string> = {
  success: 'bg-emerald-500/10',
  error: 'bg-red-500/10',
  warning: 'bg-amber-500/10',
  info: 'bg-blue-500/10',
}

export function Header() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logoutStore = useAuthStore((s) => s.logout)
  const { setSidebarOpen } = useUIStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  const prevHistoryLength = useRef(0)

  const { toastHistory, clearHistory } = useToast()
  const hasNewHistory = toastHistory.length > prevHistoryLength.current

  useEffect(() => {
    if (historyOpen) {
      prevHistoryLength.current = toastHistory.length
    }
  }, [historyOpen, toastHistory.length])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // proceed with local logout
    }
    logoutStore()
    navigate('/login', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <header className="glass-header fixed top-0 right-0 z-30 h-16 border-b border-white/[0.06]">
      <div className="flex h-full items-center justify-between px-6">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Toast history bell */}
          <div className="relative" ref={historyRef}>
            <button
              onClick={() => {
                setHistoryOpen(!historyOpen)
                prevHistoryLength.current = toastHistory.length
              }}
              className="group relative rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
            >
              <Bell className="h-5 w-5" />
              {hasNewHistory && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                </span>
              )}
            </button>

            {/* History panel */}
            <AnimatePresence>
              {historyOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1525] shadow-2xl shadow-black/50 backdrop-blur-xl"
                >
                  {/* Ambient glow */}
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-rose-500/10 blur-3xl" />
                  <div className="pointer-events-none absolute -left-8 bottom-0 h-20 w-20 rounded-full bg-amber-500/10 blur-3xl" />

                  {/* Header */}
                  <div className="relative flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-100">Notifications</span>
                      {toastHistory.length > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/10 px-1.5 text-[11px] font-semibold text-gray-400">
                          {toastHistory.length > 99 ? '99+' : toastHistory.length}
                        </span>
                      )}
                    </div>
                    {toastHistory.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="relative max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {toastHistory.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                        <Bell className="h-8 w-8 text-gray-600" />
                        <p className="text-sm text-gray-500">No notifications yet</p>
                        <p className="text-xs text-gray-600">Notifications will appear here as they arrive</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {[...toastHistory].reverse().map((entry) => (
                          <HistoryRow key={entry.id + entry.timestamp} entry={entry} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User dropdown trigger */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="group flex items-center gap-3 rounded-xl p-1.5 transition-all duration-200 hover:bg-white/[0.04]"
            >
              {/* Avatar */}
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 text-xs font-bold text-white shadow-lg shadow-blue-500/20 ring-2 ring-white/[0.08] transition-shadow duration-200 group-hover:ring-white/[0.15]">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0f1e] bg-emerald-400" />
              </div>

              {/* Name & role */}
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-gray-200 transition-colors group-hover:text-white">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role || 'member'}
                </p>
              </div>

              <ChevronDown className="h-4 w-4 text-gray-500 transition-all duration-200 group-hover:text-gray-300" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1525] shadow-2xl shadow-black/50 backdrop-blur-xl"
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/10 blur-3xl" />
                  <div className="pointer-events-none absolute -left-8 bottom-0 h-20 w-20 rounded-full bg-purple-500/10 blur-3xl" />

                  <div className="relative border-b border-white/[0.06] px-4 py-3.5">
                    <p className="text-sm font-semibold text-gray-100">
                      {user?.name || 'User'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {user?.email || ''}
                    </p>
                  </div>

                  <div className="relative py-1.5">
                    <button
                      onClick={() => { navigate('/settings'); setDropdownOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-gray-200"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] ring-1 ring-white/[0.06]">
                        <Settings className="h-3.5 w-3.5" />
                      </div>
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-red-500/20">
                        <LogOut className="h-3.5 w-3.5" />
                      </div>
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}

function HistoryRow({ entry }: { entry: ToastHistoryEntry }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]">
      <div className={cn(
        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
        historyBgStyles[entry.variant],
      )}>
        <span className={historyIconStyles[entry.variant]}>
          {historyIcons[entry.variant]}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-200">{entry.message}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {entry.count > 1 && (
            <span className={cn(
              'flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold',
              entry.variant === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
              entry.variant === 'error' ? 'bg-red-500/20 text-red-300' :
              entry.variant === 'warning' ? 'bg-amber-500/20 text-amber-300' :
              'bg-blue-500/20 text-blue-300',
            )}>
              {entry.count > 99 ? '99+' : entry.count}x
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Clock className="h-3 w-3" />
            {timeAgo(entry.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}
