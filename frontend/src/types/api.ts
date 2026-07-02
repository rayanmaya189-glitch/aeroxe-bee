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
