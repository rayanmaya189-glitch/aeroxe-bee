import { test, expect } from '../fixtures/helpers'

const API_BASE = process.env.API_URL || 'http://localhost:8080'

test.describe('Admin API', () => {
  test('GET /api/v1/admin/stats requires admin auth', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/admin/stats`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/admin/stats returns stats with admin token', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBeTruthy()
  })

  test('GET /api/v1/admin/accounts lists accounts', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/admin/accounts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/admin/users lists users', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/admin/circuit-breakers lists circuit breakers', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/admin/circuit-breakers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/admin/dead-letters lists dead letters', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/admin/dead-letters`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/admin/fraud-flags lists fraud flags', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/admin/fraud-flags`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/admin/smishing-flags lists smishing flags', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/admin/smishing-flags`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('POST /api/v1/admin/users requires admin auth', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/admin/users`, {
      data: { name: 'Test', email: 'test@test.com', password: 'pass', role: 'staff' },
    })
    expect(res.status()).toBe(401)
  })
})
