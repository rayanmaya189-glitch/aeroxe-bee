import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

interface FailedRequest {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}

let isRefreshing = false
let failedQueue: FailedRequest[] = []

function processQueue(token: string, err: unknown) {
  failedQueue.forEach((p) => {
    if (err) {
      p.reject(err)
    } else {
      p.resolve(token)
    }
  })
  failedQueue = []
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach JWT or API key
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    const apiKey = localStorage.getItem('api_key')
    if (apiKey) {
      config.headers.Authorization = `Bearer ${apiKey}`
    }
  }
  return config
})

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Don't intercept login, refresh, or already-retried requests
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(err)
    }
    const url = originalRequest.url || ''
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register')) {
      return Promise.reject(err)
    }

    if (err.response?.status !== 401) {
      return Promise.reject(err)
    }

    const refreshToken = sessionStorage.getItem('refresh_token')
    if (!refreshToken) {
      useAuthStore.getState().logout()
      return Promise.reject(err)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const res = await api.post<{ success: boolean; data: { token: string } }>(
        '/auth/refresh',
        { refreshToken },
      )
      if (!res.data.success || !res.data.data) {
        throw new Error('Refresh failed')
      }
      const newToken = res.data.data.token
      sessionStorage.setItem('auth_token', newToken)
      processQueue(newToken, null)
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch (refreshErr) {
      processQueue('', refreshErr)
      useAuthStore.getState().logout()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
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
