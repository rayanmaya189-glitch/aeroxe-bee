import { test, expect, type APIRequestContext } from '../fixtures/helpers'

const API_BASE = process.env.API_URL || 'http://localhost:8080'

test.describe('Auth API', () => {
  test('POST /api/v1/health returns healthy', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/health`)
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBeTruthy()
  })

  test('POST /api/v1/auth/login with valid credentials returns token', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: { email: 'admin@aeroxe.com', password: process.env.ADMIN_PASSWORD || '' },
    })
    const json = await res.json()
    expect(json.success).toBeTruthy()
    expect(json.data.token).toBeTruthy()
    expect(json.data.refreshToken).toBeTruthy()
  })

  test('POST /api/v1/auth/login with invalid credentials returns 401', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: { email: 'wrong@example.com', password: 'wrongpassword' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/v1/auth/register creates a new account', async ({ request }) => {
    const uniqueEmail = `testuser-${Date.now()}@example.com`
    const res = await request.post(`${API_BASE}/api/v1/auth/register`, {
      data: { name: 'Test User', email: uniqueEmail, password: 'TestPass123!' },
    })
    const json = await res.json()
    expect(json.success).toBeTruthy()
    expect(json.data.token).toBeTruthy()
    expect(json.data.user.email).toBe(uniqueEmail)
  })

  test('GET /api/v1/auth/profile returns user profile with valid token', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/auth/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const json = await res.json()
    expect(json.success).toBeTruthy()
    expect(json.data.email).toBeTruthy()
  })

  test('GET /api/v1/auth/profile returns 401 without token', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/auth/profile`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/v1/auth/refresh returns new tokens', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: { email: 'admin@aeroxe.com', password: process.env.ADMIN_PASSWORD || '' },
    })
    const loginJson = await loginRes.json()
    const refreshToken = loginJson.data.refreshToken

    const res = await request.post(`${API_BASE}/api/v1/auth/refresh`, {
      data: { refresh_token: refreshToken },
    })
    const json = await res.json()
    expect(json.success).toBeTruthy()
    expect(json.data.token).toBeTruthy()
  })
})
