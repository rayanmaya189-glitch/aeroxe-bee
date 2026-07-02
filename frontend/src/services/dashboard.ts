import api from './api'
import type { ApiResponse } from '@/types/api'
import type { DashboardStats, DailyChartData, ActivityItem, Account } from '@/types/models'

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<ApiResponse<DashboardStats>>('/admin/stats')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load stats')
  return res.data.data
}

export async function getDailyChartData(): Promise<DailyChartData> {
  const res = await api.get<ApiResponse<DailyChartData>>('/admin/charts/daily')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load chart data')
  return res.data.data
}

export async function getActivityFeed(): Promise<ActivityItem[]> {
  const res = await api.get<ApiResponse<ActivityItem[]>>('/admin/activity')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load activity')
  return res.data.data
}

export async function getAccounts(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  sortBy?: string
  sortOrder?: string
}): Promise<{ data: Account[]; total: number }> {
  const res = await api.get<ApiResponse<{ data: Account[]; total: number }>>('/admin/accounts', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load accounts')
  return res.data.data
}

export async function suspendAccount(id: string): Promise<void> {
  await api.post(`/admin/accounts/${id}/suspend`)
}

export async function activateAccount(id: string): Promise<void> {
  await api.post(`/admin/accounts/${id}/activate`)
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete(`/admin/accounts/${id}`)
}
