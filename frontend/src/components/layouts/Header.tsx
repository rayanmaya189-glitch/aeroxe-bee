import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { logout } from '@/services/auth'
import { LogOut, Settings, ChevronDown, Menu } from 'lucide-react'

export function Header() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logoutStore = useAuthStore((s) => s.logout)
  const { setSidebarOpen } = useUIStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
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
              {/* Online indicator */}
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

            {/* Chevron */}
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
                {/* Ambient glow */}
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-8 bottom-0 h-20 w-20 rounded-full bg-purple-500/10 blur-3xl" />

                {/* User info */}
                <div className="relative border-b border-white/[0.06] px-4 py-3.5">
                  <p className="text-sm font-semibold text-gray-100">
                    {user?.name || 'User'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {user?.email || ''}
                  </p>
                </div>

                {/* Menu items */}
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
    </header>
  )
}
