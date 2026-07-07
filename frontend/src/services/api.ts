import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach JWT or API key
api.interceptors.request.use((config) => {
  // Check store first (for JWT auth)
  const token = sessionStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    // Fallback to stored API key (for API key auth)
    const apiKey = localStorage.getItem('api_key')
    if (apiKey) {
      config.headers.Authorization = `Bearer ${apiKey}`
    }
  }
  return config
})

// Response interceptor: handle auth errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Only clear auth for non-login requests
      const isLogin = err.config?.url?.includes('/auth/login')
      if (!isLogin) {
        useAuthStore.getState().logout()
        // Don't redirect here; let the component handle it via store state
      }
    }
    return Promise.reject(err)
  }
)

export default api

// --- Device endpoints ---

export interface OnlineDevice {
  id: string
  name: string
  phone_number: string
  carrier: string
  sim_slot: number
  status: string
}

export async function getOnlineDevices(): Promise<OnlineDevice[]> {
  const res = await api.get('/member/devices?online_only=true')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load devices')
  return res.data.data
}
