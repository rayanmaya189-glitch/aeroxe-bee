import api from './api'
import type { ApiResponse, LoginRequest, LoginResponse } from '@/types/api'

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Login failed')
  return res.data.data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function refreshToken(token: string): Promise<string> {
  const res = await api.post<ApiResponse<{ token: string }>>('/auth/refresh', { refreshToken: token })
  if (!res.data.success || !res.data.data) throw new Error('Token refresh failed')
  return res.data.data.token
}

export async function getProfile() {
  const res = await api.get<ApiResponse>('/auth/profile')
  return res.data.data
}

export async function updateProfile(data: { name?: string; email?: string }) {
  const res = await api.put<ApiResponse>('/auth/profile', data)
  return res.data.data
}

export async function changePassword(data: { currentPassword: string; newPassword: string }) {
  const res = await api.post<ApiResponse>('/auth/change-password', data)
  return res.data
}
