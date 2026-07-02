import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/utils/cn'
import { logout as logoutApi } from '@/services/auth'

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setTheme = useUIStore((s) => s.setTheme)
  const theme = useUIStore((s) => s.theme)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
      // proceed with local logout even if server call fails
    }
    logout()
    navigate('/login')
  }

  return (
    <header
      className={cn(
        'glass-header sticky top-0 z-30 flex h-16 items-center justify-between px-4',
        isMobile ? 'ml-0' : sidebarOpen ? 'ml-64' : 'ml-16',
        'transition-all duration-300',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-xl p-2 text-surface-500 hover:bg-primary-400/10 hover:text-primary-600 dark:hover:bg-primary-400/10 dark:hover:text-primary-400"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
          className="rounded-xl p-2 text-surface-500 hover:bg-primary-400/10 hover:text-primary-600 dark:hover:bg-primary-400/10 dark:hover:text-primary-400"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-primary-400/10 dark:hover:bg-primary-400/10"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-400/15 text-sm font-semibold text-primary-700 dark:bg-primary-400/20 dark:text-primary-400">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
          </button>

          {dropdownOpen && (
            <div className="glass-card absolute right-0 top-full mt-1 w-56 rounded-xl p-1.5">
              <div className="border-b border-surface-200/50 px-3 py-2 dark:border-surface-700/50">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{user?.name}</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">{user?.email}</p>
              </div>
              <button
                onClick={() => { navigate('/settings'); setDropdownOpen(false) }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100/80 dark:text-surface-400 dark:hover:bg-surface-700/60"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
