import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: AuthUser) => void
  setLoading: (loading: boolean) => void
  login: (token: string, refreshToken: string | undefined, user: AuthUser) => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: true }),

  setLoading: (isLoading) => set({ isLoading }),

  login: (token, refreshToken, user) => {
    sessionStorage.setItem('auth_token', token)
    sessionStorage.setItem('auth_user', JSON.stringify(user))
    if (refreshToken) {
      sessionStorage.setItem('refresh_token', refreshToken)
    }
    set({ user, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_user')
    sessionStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  hydrate: () => {
    try {
      const token = sessionStorage.getItem('auth_token')
      const stored = sessionStorage.getItem('auth_user')
      if (token && stored) {
        const user = JSON.parse(stored) as AuthUser
        if (user && user.id && user.email) {
          set({ user, isAuthenticated: true, isLoading: false })
          return
        }
      }
    } catch {
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('auth_user')
      sessionStorage.removeItem('refresh_token')
    }
    set({ isAuthenticated: false, isLoading: false })
  },
}))
