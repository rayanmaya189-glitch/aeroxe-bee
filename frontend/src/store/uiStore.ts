import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  sidebarOpen: boolean
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  toasts: Toast[]
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: Theme) => void
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const applyTheme = (theme: Theme) => {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  return resolved
}

const storedTheme = (localStorage.getItem('theme') as Theme) || 'system'

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  theme: storedTheme,
  resolvedTheme: applyTheme(storedTheme),
  toasts: [],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    const resolvedTheme = applyTheme(theme)
    set({ theme, resolvedTheme })
  },

  addToast: (toast) => {
    const id = crypto.randomUUID()
    const newToast: Toast = { ...toast, id }
    set((s) => ({ toasts: [...s.toasts, newToast] }))

    const duration = toast.duration ?? 4000
    setTimeout(() => get().removeToast(id), duration)

    return id
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

const mql = window.matchMedia('(prefers-color-scheme: dark)')
mql.addEventListener('change', () => {
  const { theme } = useUIStore.getState()
  if (theme === 'system') {
    applyTheme('system')
  }
})
