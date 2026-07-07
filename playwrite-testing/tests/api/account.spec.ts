import { test, expect } from '../fixtures/helpers'

const API_BASE = process.env.API_URL || 'http://localhost:8080'

test.describe('Account API', () => {
  test('GET /api/v1/account/profile returns profile', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/account/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBeTruthy()
    expect(json.data.email).toBeTruthy()
  })

  test('GET /api/v1/account/api-keys lists API keys', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/account/api-keys`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/account/subscription returns subscription', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/account/subscription`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/account/usage returns usage', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/account/usage`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/account/profile without auth returns 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/account/profile`)
    expect(res.status()).toBe(401)
  })
})
