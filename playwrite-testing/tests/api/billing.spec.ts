import { test, expect } from '../fixtures/helpers'

const API_BASE = process.env.API_URL || 'http://localhost:8080'

test.describe('Billing API', () => {
  test('GET /api/v1/public/plans returns plans without auth', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/public/plans`)
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBeTruthy()
    expect(Array.isArray(json.data)).toBeTruthy()
  })

  test('GET /api/v1/plans returns plans with auth', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/plans`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBeTruthy()
  })

  test('GET /api/v1/public/payment-methods returns payment methods', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/public/payment-methods`)
    expect(res.ok()).toBeTruthy()
  })

  test('POST /api/v1/plans requires admin auth', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/plans`, {
      data: { id: 'test', name: 'Test Plan' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/billing/usage returns usage with auth', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/billing/usage`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })
})
