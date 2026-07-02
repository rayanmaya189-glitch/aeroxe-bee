export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'manager'
  status: 'active' | 'inactive' | 'suspended'
  avatar?: string
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

export interface Account {
  id: string
  email: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'disabled'
  createdAt: string
  messageCount: number
  apiKeys: number
}

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalMessages: number
  messagesToday: number
  messagesDelivered: number
  messagesFailed: number
  deliveryRate: number
  activeDevices: number
  revenue: number
  growthRate: number
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

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  details: string
  ip: string
  timestamp: string
}

export interface ApiKey {
  id: string
  name: string
  key: string
  lastUsed?: string
  createdAt: string
  status: 'active' | 'revoked'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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
