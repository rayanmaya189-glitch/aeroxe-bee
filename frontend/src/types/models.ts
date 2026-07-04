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
  url: string
  events: string[]
  active: boolean
  created_at: string
  last_rotated_at?: string
}

export interface Template {
  id: string
  account_id: string
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
  dedicated_pool: boolean
  default_routing_strategy: string
  price_per_sms: number
  monthly_price: number
  is_popular: boolean
  cta_text: string
}

export interface Subscription {
  plan_type: string
  billing_cycle: string
  status: string
  quota_daily: number
  quota_monthly: number
  max_queue_depth: number
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
