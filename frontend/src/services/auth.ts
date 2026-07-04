import api from './api'
import type { ApiResponse, LoginRequest, LoginResponse } from '@/types/api'

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Login failed')
  return res.data.data
}

export async function register(data: { name: string; email: string; password: string }): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/register', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Registration failed')
  return res.data.data
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } catch {
    // Ignore logout errors
  }
}

export async function refreshToken(token: string): Promise<string> {
  const res = await api.post<ApiResponse<{ token: string }>>('/auth/refresh', { refreshToken: token })
  if (!res.data.success || !res.data.data) throw new Error('Token refresh failed')
  return res.data.data.token
}

export async function getProfile() {
  const res = await api.get<ApiResponse>('/auth/profile')
  if (!res.data.success || !res.data.data) throw new Error('Failed to get profile')
  return res.data.data
}

export async function updateProfile(data: { name?: string; email?: string }) {
  const res = await api.put<ApiResponse>('/auth/profile', data)
  if (!res.data.success) throw new Error('Failed to update profile')
  return res.data.data
}

export async function changePassword(data: { currentPassword: string; newPassword: string }) {
  const res = await api.post<ApiResponse>('/auth/change-password', {
    old_password: data.currentPassword,
    new_password: data.newPassword,
  })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to change password')
  return res.data
}

export async function verify2FALogin(email: string, code: string): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/2fa/verify-login', { email, code })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? '2FA verification failed')
  return res.data.data
}

// ─── Session Management ───────────────────────────────────────

export interface UserSession {
  id: string
  user_id: string
  user_type: string
  ip_address: string
  user_agent: string
  last_active: string
  created_at: string
  revoked_at?: string
}

export async function getSessions(): Promise<UserSession[]> {
  const res = await api.get<ApiResponse<UserSession[]>>('/auth/sessions')
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch sessions')
  return res.data.data
}

export async function revokeSession(sessionId: string): Promise<void> {
  const res = await api.delete<ApiResponse>(`/auth/sessions/${sessionId}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to revoke session')
}

export async function revokeAllSessions(): Promise<void> {
  const res = await api.delete<ApiResponse>('/auth/sessions')
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to revoke sessions')
}
