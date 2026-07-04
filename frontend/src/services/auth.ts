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

export async function verify2FALogin(token: string, code: string): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/login/2fa', { token, code })
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

// ─── API Key Management ──────────────────────────────────────

export interface ApiKeyInfo {
  id: string
  label: string
  scopes: string[]
  expires_at?: string
  revoked_at?: string
  created_at: string
}

export interface ApiKeyCreateResult {
  id: string
  label: string
  api_key: string
  scopes: string[]
  expires_at?: string
  created_at: string
}

export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  const res = await api.get<ApiResponse<ApiKeyInfo[]>>('/account/api-keys')
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch API keys')
  return res.data.data
}

export async function createApiKey(data: { label: string; scopes: string[]; expires_in?: string }): Promise<ApiKeyCreateResult> {
  const res = await api.post<ApiResponse<ApiKeyCreateResult>>('/account/api-keys', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to create API key')
  return res.data.data
}

export async function revokeApiKey(keyId: string): Promise<void> {
  const res = await api.delete<ApiResponse>(`/account/api-keys/${keyId}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to revoke API key')
}
