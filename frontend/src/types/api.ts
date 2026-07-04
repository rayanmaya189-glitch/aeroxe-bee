export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken?: string
  requires_2fa?: boolean
  two_fa_pending?: boolean
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export interface ApiError {
  message: string
  status: number
  code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
