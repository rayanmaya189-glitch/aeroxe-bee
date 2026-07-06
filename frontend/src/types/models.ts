export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'staff' | 'viewer'
  status: 'active' | 'inactive' | 'suspended'
  avatar?: string
  created_at: string
  updated_at: string
  last_login?: string
}

export interface Account {
  id: string
  email: string
  name: string
  plan_id: 'free' | 'pro' | 'scale' | 'enterprise'
  status: 'active' | 'suspended' | 'disabled'
  created_at: string
  verified: boolean
  risk_score: number
}

export interface DashboardStats {
  total_accounts: number
  active_devices: number
  total_sent: number
  total_delivered: number
  total_failed: number
  avg_confidence: number
  active_circuits: number
  pending_fraud: number
  queue_depth: Record<string, number>
  timestamp: string
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface DailyChartData {
  messages: ChartDataPoint[]
  users: ChartDataPoint[]
  revenue: ChartDataPoint[]
}

export interface AnalyticsDaily {
  id: string
  date: string
  total_sent: number
  total_delivered: number
  total_failed: number
  avg_confidence: number
  otp_sent: number
  transactional_sent: number
  marketing_sent: number
}

export interface Device {
  id: string
  physical_device_id: string
  account_id: string
  sim_slot: number
  carrier: string
  status: 'ONLINE' | 'OFFLINE'
  sim_health_status: 'HEALTHY' | 'DEGRADED' | 'BLOCKED'
  health_trend_slope: number
  reliability_score: number
  reputation_score: number
  success_rate_24h: number
  uptime_ratio_24h: number
  avg_latency_ms: number
  messages_sent_count: number
  country_code: string
  region: string
  circuit_breaker_state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  last_seen?: string
  last_pong_at?: string
}

export interface Webhook {
  id: string
  account_id: string
  account_name?: string
  url: string
  events: string[]
  active: boolean
  created_at: string
  last_rotated_at?: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  message_id: string
  event: string
  attempt_count: number
  status_code: number
  response_body: string
  last_status: string
  last_attempt_at: string
  completed: boolean
  created_at: string
}

export interface Template {
  id: string
  account_id: string
  account_name?: string
  name: string
  body: string
  variables: string[]
  approval_status: 'pending' | 'approved' | 'rejected'
  approved_at?: string
  created_at: string
}

export interface Plan {
  id: string
  name: string
  visibility: 'public' | 'private' | 'custom'
  daily_quota: number
  monthly_quota: number
  overage_buffer_pct: number
  max_queue_depth: number
  max_devices: number
  max_templates: number
  dedicated_pool: boolean
  default_routing_strategy: string
  price_per_sms: number
  monthly_price: number
  is_popular: boolean
  cta_text: string
  features: string[]
}

export interface PlanChangeRequest {
  id: string
  requested_by: string
  requested_by_name: string
  action: 'create' | 'update' | 'delete'
  plan_id: string
  payload: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_by_name: string
  review_notes: string
  created_at: string
  reviewed_at?: string
}

export interface Subscription {
  plan_type: string
  billing_cycle: string
  status: string
  quota_daily: number
  quota_monthly: number
  max_queue_depth: number
  max_templates: number
  renewal_date: string
}

export interface CircuitBreakerEvent {
  scope: string
  scope_value: string
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  opened_at: string
  reason: string
}

export interface DeadLetter {
  id: string
  stream: string
  message_id: string
  payload: string
  fail_reason: string
  failed_at: string
  retry_count: number
}

export interface FraudFlag {
  id: string
  account_id: string
  device_id?: string
  flag_type: string
  description: string
  severity: string
  weight: number
  reviewed: boolean
  created_at: string
}

export interface FeatureCatalogItem {
  id: string
  name: string
  category: string
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  device_id?: string
  recipient: string
  sender: string
  message_type: 'otp' | 'transactional' | 'marketing'
  status: string
  delivery_status: 'SENT' | 'CARRIER_ACCEPTED' | 'PROBABLE_DELIVERED' | 'FAILED'
  confidence_score: number
  error_reason?: string
  routing_strategy_used: string
  created_at: string
  delivered_at?: string
}

export interface MemberDashboard {
  account: {
    id: string
    name: string
    email: string
    plan: string
    status: string
  }
  devices: {
    total: number
    online: number
  }
  messages: {
    total_sent: number
    total_delivered: number
    total_failed: number
    delivery_rate: number
  }
  usage: {
    daily: number
    monthly: number
  }
  subscription: Subscription | null
}

export interface ActivityItem {
  id: string
  type: 'message' | 'user' | 'alert' | 'system'
  action: string
  description: string
  user?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface ApiKey {
  id: string
  label: string
  api_key?: string
  scopes: string[]
  expires_at?: string
  created_at: string
  revoked_at?: string
}

export interface FilterState {
  search: string
  status?: string
  role?: string
  dateFrom?: string
  dateTo?: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

// BI Dashboard types
export interface BIDashboard {
  total_accounts: number
  active_accounts: number
  total_devices: number
  online_devices: number
  total_messages: number
  total_delivered: number
  total_failed: number
  total_revenue: number
  account_growth: { date: string; count: number }[]
  top_accounts: { account_id: string; account_name: string; total_sent: number; delivered: number; failed: number }[]
  device_fleet: { status: string; count: number }[]
  routing_breakdown: { strategy: string; count: number }[]
  type_breakdown: { type: string; count: number }[]
  hourly_distribution: { hour: number; count: number }[]
  delivery_trend: { date: string; count: number }[]
  revenue_by_plan: { plan_id: string; plan_name: string; count: number; revenue: number }[]
}
