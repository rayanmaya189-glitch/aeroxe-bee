import api from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { DashboardStats, DailyChartData, Account, AnalyticsDaily, Webhook, Template, Plan, CircuitBreakerEvent, DeadLetter, FraudFlag, FeatureCatalogItem, BIDashboard } from '@/types/models'

// Dashboard stats (admin)
export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<ApiResponse<DashboardStats>>('/admin/stats')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load stats')
  return res.data.data
}

// Daily chart data (admin)
export async function getDailyChartData(): Promise<DailyChartData> {
  const res = await api.get<ApiResponse<DailyChartData>>('/admin/charts/daily')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load chart data')
  return res.data.data
}

// Activity feed (admin)
export async function getActivityFeed(): Promise<PaginatedResponse<Record<string, unknown>>> {
  const res = await api.get<ApiResponse<PaginatedResponse<Record<string, unknown>>>>('/admin/activity')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load activity')
  return res.data.data
}

// Accounts list (admin, server-side paginated)
export async function getAccounts(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
}): Promise<PaginatedResponse<Account>> {
  const res = await api.get<ApiResponse<PaginatedResponse<Account>>>('/admin/accounts', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load accounts')
  const d = res.data.data
  return {
    data: Array.isArray(d.data) ? d.data : [],
    total: d.total ?? 0,
    page: d.page ?? params.page ?? 1,
    page_size: d.page_size ?? params.pageSize ?? 20,
    total_pages: d.total_pages ?? 0,
  }
}

export async function suspendAccount(id: string): Promise<void> {
  const res = await api.post(`/admin/accounts/${id}/suspend`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to suspend')
}

export async function activateAccount(id: string): Promise<void> {
  const res = await api.post(`/admin/accounts/${id}/activate`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to activate')
}

export async function deleteAccount(id: string): Promise<void> {
  const res = await api.delete(`/admin/accounts/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete')
}

// Analytics (admin)
export async function getAnalytics(params?: { start?: string; end?: string }): Promise<AnalyticsDaily[]> {
  const res = await api.get<ApiResponse<AnalyticsDaily[]>>('/admin/analytics', { params })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to load analytics')
  return Array.isArray(res.data.data) ? res.data.data : []
}

// Webhooks (admin)
export async function getWebhooks(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<Webhook>> {
  const res = await api.get<ApiResponse<PaginatedResponse<Webhook>>>('/admin/webhooks', { params: { page: params.page ?? 1, pageSize: params.pageSize ?? 50 } })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load webhooks')
  const d = res.data.data
  return { data: Array.isArray(d.data) ? d.data : [], total: d.total ?? 0, page: d.page ?? 1, page_size: d.page_size ?? 50, total_pages: d.total_pages ?? 0 }
}

export async function createWebhook(data: { url: string; events: string[] }): Promise<Webhook & { secret?: string }> {
  const res = await api.post<ApiResponse<Webhook & { secret?: string }>>('/webhooks', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to create webhook')
  return res.data.data
}

export async function deleteWebhook(id: string): Promise<void> {
  const res = await api.delete(`/webhooks/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete webhook')
}

export async function rotateWebhookSecret(id: string): Promise<string> {
  const res = await api.post<ApiResponse<{ secret: string }>>(`/webhooks/${id}/rotate-secret`)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to rotate secret')
  return res.data.data.secret
}

export async function bulkDeleteWebhooks(ids: string[]): Promise<void> {
  const res = await api.post('/admin/webhooks/bulk-delete', { ids })
  if (!res.data.success) throw new Error(res.data.error ?? 'Bulk delete failed')
}

// Templates (admin)
export async function getTemplates(params: { page?: number; pageSize?: number; status?: string } = {}): Promise<PaginatedResponse<Template>> {
  const res = await api.get<ApiResponse<PaginatedResponse<Template>>>('/admin/templates', { params: { page: params.page ?? 1, pageSize: params.pageSize ?? 50, ...params.status ? { status: params.status } : {} } })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load templates')
  const d = res.data.data
  return { data: Array.isArray(d.data) ? d.data : [], total: d.total ?? 0, page: d.page ?? 1, page_size: d.page_size ?? 50, total_pages: d.total_pages ?? 0 }
}

export async function createTemplate(data: { name: string; body: string; variables: string[] }): Promise<Template> {
  const res = await api.post<ApiResponse<Template>>('/templates', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to create template')
  return res.data.data
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await api.delete(`/templates/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete template')
}

export async function getPendingTemplates(): Promise<Template[]> {
  const res = await api.get<ApiResponse<Template[]>>('/admin/templates/pending')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load pending templates')
  return res.data.data
}

export async function approveTemplate(id: string): Promise<void> {
  const res = await api.post(`/admin/templates/${id}/approve`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to approve template')
}

export async function rejectTemplate(id: string): Promise<void> {
  const res = await api.post(`/admin/templates/${id}/reject`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to reject template')
}

export async function bulkDeleteTemplates(ids: string[]): Promise<void> {
  const res = await api.post('/admin/templates/bulk-delete', { ids })
  if (!res.data.success) throw new Error(res.data.error ?? 'Bulk delete failed')
}

export async function bulkApproveTemplates(ids: string[]): Promise<void> {
  const res = await api.post('/admin/templates/bulk-approve', { ids })
  if (!res.data.success) throw new Error(res.data.error ?? 'Bulk approve failed')
}

export async function bulkRejectTemplates(ids: string[]): Promise<void> {
  const res = await api.post('/admin/templates/bulk-reject', { ids })
  if (!res.data.success) throw new Error(res.data.error ?? 'Bulk reject failed')
}

// Plans (billing)
export async function getPlans(): Promise<Plan[]> {
  const res = await api.get<ApiResponse<PaginatedResponse<Plan>>>('/plans')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load plans')
  return res.data.data.data || []
}

export async function createPlan(data: Plan): Promise<Plan> {
  const res = await api.post<ApiResponse<Plan>>('/plans', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to create plan')
  return res.data.data
}

export async function updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
  const res = await api.put<ApiResponse<Plan>>(`/plans/${id}`, data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to update plan')
  return res.data.data
}

export async function deletePlan(id: string): Promise<void> {
  const res = await api.delete(`/plans/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete plan')
}

// Circuit breakers (admin)
export async function getCircuitBreakers(): Promise<CircuitBreakerEvent[]> {
  const res = await api.get<ApiResponse<CircuitBreakerEvent[]>>('/admin/circuit-breakers')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load circuit breakers')
  return res.data.data
}

export async function resetCircuitBreaker(scope: string, id: string): Promise<void> {
  const res = await api.post(`/admin/circuit-breakers/${scope}/${id}/reset`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to reset circuit breaker')
}

// Dead letters (admin)
export async function getDeadLetters(): Promise<DeadLetter[]> {
  const res = await api.get<ApiResponse<{ data: DeadLetter[]; total: number; page: number; page_size: number; total_pages: number }>>('/admin/dead-letters')
  if (!res.data.success || !res.data.data) return []
  const wrapper = res.data.data
  return Array.isArray(wrapper) ? wrapper : (wrapper?.data ?? [])
}

export async function retryDeadLetter(id: string): Promise<void> {
  const res = await api.post(`/admin/dead-letters/${id}/retry`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to retry dead letter')
}

// Fraud flags (admin)
// ─── Member Send SMS ──────────────────────────────────────────

export async function sendSMS(data: {
  recipient: string
  message: string
  sender?: string
  message_type?: string
}): Promise<{ message_id: string; status: string; created_at: string }> {
  const res = await api.post<ApiResponse<{ message_id: string; status: string; created_at: string }>>('/member/send', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Send failed')
  return res.data.data
}

// ─── Bulk SMS & Scheduling ──────────────────────────────────────

export interface BulkSendResult {
  recipient: string
  message_id: string
  status: string
  error?: string
}

export interface BulkSendResponse {
  total: number
  sent: number
  results: BulkSendResult[]
  created_at: string
}

export async function bulkSendSMS(data: {
  recipients: string[]
  message: string
  sender?: string
  message_type?: string
}): Promise<BulkSendResponse> {
  const res = await api.post<ApiResponse<BulkSendResponse>>('/send/bulk', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Bulk send failed')
  return res.data.data
}

export async function scheduleSendSMS(data: {
  recipient: string
  message: string
  scheduled_at: string
  sender?: string
  message_type?: string
}): Promise<{ message_id: string; status: string; scheduled_at: string }> {
  const res = await api.post<ApiResponse<{ message_id: string; status: string; scheduled_at: string }>>('/send/schedule', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Schedule failed')
  return res.data.data
}

export async function getFraudFlags(): Promise<FraudFlag[]> {
  const res = await api.get<ApiResponse<PaginatedResponse<FraudFlag>>>('/admin/fraud-flags')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load fraud flags')
  return res.data.data.data || []
}

export async function reviewFraudFlag(id: string): Promise<void> {
  const res = await api.post(`/admin/fraud-flags/${id}/review`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to review fraud flag')
}

// Smishing flags (admin) — content-based fraud flags (smishing, phishing, scam, suspicious sender/recipient)
export async function getSmishingFlags(): Promise<FraudFlag[]> {
  const res = await api.get<ApiResponse<PaginatedResponse<FraudFlag>>>('/admin/smishing-flags')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load smishing flags')
  return res.data.data.data || []
}

export async function getSmishingFlagsCount(): Promise<number> {
  const res = await api.get<ApiResponse<{ count: number }>>('/admin/smishing-flags/count')
  if (!res.data.success || res.data.data === undefined) throw new Error(res.data.error ?? 'Failed to load smishing flags count')
  return res.data.data.count
}

export async function bulkReviewSmishingFlags(ids: string[]): Promise<void> {
  const res = await api.post('/admin/smishing-flags/bulk-review', { ids })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to bulk review')
}

export async function reviewSmishingFlag(id: string): Promise<void> {
  const res = await api.post(`/admin/fraud-flags/${id}/review`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to review smishing flag')
}

// Abuse flags (admin)
export async function getAbuseFlags(): Promise<FraudFlag[]> {
  const res = await api.get<ApiResponse<PaginatedResponse<FraudFlag>>>('/admin/abuse-flags')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load abuse flags')
  return res.data.data.data || []
}

// Users management (admin)
export async function getUsers(params: {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  status?: string
  sortBy?: string
  sortOrder?: string
}): Promise<PaginatedResponse<import('@/types/models').User>> {
  const res = await api.get<ApiResponse<PaginatedResponse<import('@/types/models').User>>>('/admin/users', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load users')
  return res.data.data
}

export async function getUser(id: string): Promise<import('@/types/models').User> {
  const res = await api.get<ApiResponse<import('@/types/models').User>>(`/admin/users/${id}`)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'User not found')
  return res.data.data
}

export async function createUser(data: { name: string; email: string; password: string; role: string }): Promise<import('@/types/models').User> {
  const res = await api.post<ApiResponse<import('@/types/models').User>>('/admin/users', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to create user')
  return res.data.data
}

export async function updateUser(id: string, data: Partial<import('@/types/models').User>): Promise<import('@/types/models').User> {
  const res = await api.put<ApiResponse<import('@/types/models').User>>(`/admin/users/${id}`, data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to update user')
  return res.data.data
}

export async function deleteUser(id: string): Promise<void> {
  const res = await api.delete(`/admin/users/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete user')
}

export async function bulkDeleteUsers(ids: string[]): Promise<void> {
  const res = await api.post('/admin/users/bulk-delete', { ids })
  if (!res.data.success) throw new Error(res.data.error ?? 'Bulk delete failed')
}

export async function bulkUpdateUsers(ids: string[], data: Record<string, unknown>): Promise<void> {
  const res = await api.post('/admin/users/bulk-update', { ids, data })
  if (!res.data.success) throw new Error(res.data.error ?? 'Bulk update failed')
}

// ─── Payment Configs (admin billing settings) ──────────────────────

export interface PaymentConfig {
  id: string
  method: string
  label: string
  details: Record<string, unknown>
  enabled: boolean
  created_at: string
  updated_at: string
}

export async function getPaymentConfigs(): Promise<PaymentConfig[]> {
  const res = await api.get<ApiResponse<PaginatedResponse<PaymentConfig>>>('/admin/payment-configs')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load payment configs')
  return res.data.data.data || []
}

export async function getEnabledPaymentConfigs(): Promise<PaymentConfig[]> {
  const res = await api.get<ApiResponse<PaginatedResponse<PaymentConfig>>>('/payment-configs')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load payment configs')
  return res.data.data.data || []
}

export async function upsertPaymentConfig(data: { method: string; label: string; details: Record<string, unknown>; enabled: boolean }): Promise<void> {
  const res = await api.post('/admin/payment-configs', data)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to save payment config')
}

export async function updatePaymentConfig(id: string, data: { label: string; details: Record<string, unknown>; enabled: boolean }): Promise<void> {
  const res = await api.put(`/admin/payment-configs/${id}`, data)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to update payment config')
}

// ─── Payment Requests (maker-checker) ──────────────────────────────

export interface PaymentRequest {
  id: string
  account_id: string
  account_name: string
  plan_id: string
  plan_name: string
  billing_cycle: string
  payment_method: string
  amount: number
  proof_url: string
  status: string
  reviewed_by: string | null
  reviewed_by_name: string
  reviewed_at: string | null
  review_notes: string
  created_at: string
  updated_at: string
}

export async function getPaymentRequests(params: { page?: number; pageSize?: number; status?: string; account_id?: string; payment_method?: string; sort_by?: string; sort_order?: string } = {}): Promise<PaginatedResponse<PaymentRequest>> {
  const res = await api.get<ApiResponse<PaginatedResponse<PaymentRequest>>>('/admin/payment-requests', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load payment requests')
  return res.data.data
}

export async function getMyPaymentRequests(params: { page?: number; pageSize?: number; status?: string } = {}): Promise<PaginatedResponse<PaymentRequest>> {
  const res = await api.get<ApiResponse<PaginatedResponse<PaymentRequest>>>('/member/payment-requests', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load payment requests')
  return res.data.data
}

export async function createPaymentRequest(data: { plan_id: string; billing_cycle: string; payment_method: string; amount: number; proof_url?: string }): Promise<void> {
  const res = await api.post('/member/payment-requests', data)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to create payment request')
}

export async function approvePaymentRequest(id: string, notes?: string): Promise<void> {
  const res = await api.post(`/admin/payment-requests/${id}/approve`, { notes: notes || '' })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to approve')
}

export async function rejectPaymentRequest(id: string, notes?: string): Promise<void> {
  const res = await api.post(`/admin/payment-requests/${id}/reject`, { notes: notes || '' })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to reject')
}

// ─── Subscription Requests (member upgrade + admin approve) ─────────

export interface SubscriptionRequest {
  id: string
  account_id: string
  account_name: string
  requested_plan: string
  requested_plan_name: string
  requested_billing_cycle: string
  current_plan: string
  current_plan_name: string
  reason: string
  status: string
  reviewed_by: string | null
  reviewed_by_name: string
  reviewed_at: string | null
  review_notes: string
  created_at: string
  updated_at: string
}

export async function getSubscriptionRequests(params: { page?: number; pageSize?: number; status?: string; account_id?: string } = {}): Promise<PaginatedResponse<SubscriptionRequest>> {
  const res = await api.get<ApiResponse<PaginatedResponse<SubscriptionRequest>>>('/admin/subscription-requests', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load subscription requests')
  return res.data.data
}

export async function getMySubscriptionRequests(params: { page?: number; pageSize?: number; status?: string } = {}): Promise<PaginatedResponse<SubscriptionRequest>> {
  const res = await api.get<ApiResponse<PaginatedResponse<SubscriptionRequest>>>('/member/subscription-requests', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load subscription requests')
  return res.data.data
}

export async function createSubscriptionRequest(data: { requested_plan: string; requested_billing_cycle: string; reason: string }): Promise<void> {
  const res = await api.post('/member/subscription-requests', data)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to create subscription request')
}

export async function approveSubscriptionRequest(id: string, notes?: string): Promise<void> {
  const res = await api.post(`/admin/subscription-requests/${id}/approve`, { notes: notes || '' })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to approve')
}

export async function rejectSubscriptionRequest(id: string, notes?: string): Promise<void> {
  const res = await api.post(`/admin/subscription-requests/${id}/reject`, { notes: notes || '' })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to reject')
}

// ─── Member Preferences & KYC ─────────────────────────────────────

export interface UserPreferences {
  email_notifications: boolean
  sms_notifications: boolean
  webhook_notifications: boolean
  billing_alerts: boolean
  security_alerts: boolean
  two_fa_enabled: boolean
}

export async function getPreferences(): Promise<UserPreferences> {
  const res = await api.get<ApiResponse<UserPreferences>>('/member/preferences')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load preferences')
  return res.data.data
}

export async function updatePreferences(data: Partial<UserPreferences>): Promise<void> {
  const res = await api.put('/member/preferences', data)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to update preferences')
}

export async function getKycStatus(): Promise<{ status: string; full_name?: string; document_type?: string }> {
  const res = await api.get<ApiResponse<{ status: string; full_name?: string; document_type?: string }>>('/member/kyc')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load KYC status')
  return res.data.data
}

export async function submitKyc(data: { full_name: string; document_type: string; document_number: string; document_url: string }): Promise<void> {
  const res = await api.post('/member/kyc', data)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to submit KYC')
}

// ─── Admin KYC Review ───────────────────────────────────────────

export interface KycSubmission {
  id: string
  user_id: string
  user_email: string
  user_name: string
  full_name: string
  document_type: string
  document_number: string
  document_url: string
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export async function getKycSubmissions(params: { page?: number; pageSize?: number; status?: string } = {}): Promise<PaginatedResponse<KycSubmission>> {
  const res = await api.get<ApiResponse<PaginatedResponse<KycSubmission>>>('/admin/kyc', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load KYC submissions')
  return res.data.data
}

export async function approveKyc(id: string, notes?: string): Promise<void> {
  const res = await api.post(`/admin/kyc/${id}/approve`, { notes: notes || '' })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to approve KYC')
}

export async function rejectKyc(id: string, notes?: string): Promise<void> {
  const res = await api.post(`/admin/kyc/${id}/reject`, { notes: notes || '' })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to reject KYC')
}

// ─── 2FA ──────────────────────────────────────────────────────────

export async function get2FAStatus(): Promise<{ enabled: boolean }> {
  const res = await api.get<ApiResponse<{ enabled: boolean }>>('/auth/2fa/status')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load 2FA status')
  return res.data.data
}

export async function setup2FA(): Promise<{ secret: string; url: string; enabled: boolean }> {
  const res = await api.post<ApiResponse<{ secret: string; url: string; enabled: boolean }>>('/auth/2fa/setup')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to setup 2FA')
  return res.data.data
}

export async function verify2FA(code: string): Promise<void> {
  const res = await api.post('/auth/2fa/verify', { code })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to verify 2FA')
}

export async function disable2FA(code: string): Promise<void> {
  const res = await api.post('/auth/2fa/disable', { code })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to disable 2FA')
}

// ─── Feature Catalog (global) ─────────────────────────────────────

export async function getFeatureCatalog(): Promise<FeatureCatalogItem[]> {
  const res = await api.get<ApiResponse<PaginatedResponse<FeatureCatalogItem>>>('/feature-catalog')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load feature catalog')
  return res.data.data.data || []
}

export async function getActiveFeatureCatalog(): Promise<FeatureCatalogItem[]> {
  const res = await api.get<ApiResponse<PaginatedResponse<FeatureCatalogItem>>>('/feature-catalog?active_only=true')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load feature catalog')
  return res.data.data.data || []
}

export async function createFeatureCatalogItem(data: { name: string; category: string }): Promise<FeatureCatalogItem> {
  const res = await api.post<ApiResponse<FeatureCatalogItem>>('/admin/feature-catalog', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to create feature')
  return res.data.data
}

export async function toggleFeatureCatalogItem(id: string, active: boolean): Promise<void> {
  const res = await api.put(`/admin/feature-catalog/${id}`, { active })
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to toggle feature')
}

export async function deleteFeatureCatalogItem(id: string): Promise<void> {
  const res = await api.delete(`/admin/feature-catalog/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete feature')
}

// ─── BI Dashboard (admin) ────────────────────────────────────────

export async function getBIDashboard(): Promise<BIDashboard> {
  const res = await api.get<ApiResponse<BIDashboard>>('/admin/bi')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load BI data')
  return res.data.data
}
