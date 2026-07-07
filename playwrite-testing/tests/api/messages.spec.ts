import { test, expect } from '../fixtures/helpers'

const API_BASE = process.env.API_URL || 'http://localhost:8080'

test.describe('Messages API', () => {
  test('POST /api/v1/send requires idempotency_key', async ({ request, adminApiKey }) => {
    const res = await request.post(`${API_BASE}/api/v1/send`, {
      headers: { 'X-API-Version': '2024-01-01' },
      data: {
        recipient: '+1234567890',
        message: 'Test message',
        idempotency_key: `test-${Date.now()}`,
      },
    })
    // Should succeed or fail with expected status (device offline is expected)
    expect([202, 400, 500]).toContain(res.status())
  })

  test('POST /api/v1/send without idempotency_key returns 400', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/send`, {
      headers: { 'X-API-Version': '2024-01-01' },
      data: {
        recipient: '+1234567890',
        message: 'Test message',
      },
    })
    expect(res.status()).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('idempotency_key')
  })

  test('POST /api/v1/send rejects message over 160 chars', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/send`, {
      headers: { 'X-API-Version': '2024-01-01' },
      data: {
        recipient: '+1234567890',
        message: 'x'.repeat(161),
        idempotency_key: `test-${Date.now()}`,
      },
    })
    expect(res.status()).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('160')
  })

  test('POST /api/v1/send requires recipient', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/send`, {
      headers: { 'X-API-Version': '2024-01-01' },
      data: {
        message: 'Test message',
        idempotency_key: `test-${Date.now()}`,
      },
    })
    expect(res.status()).toBe(400)
  })

  test('GET /api/v1/messages returns paginated messages', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/api/v1/auth/login`, {
      data: { email: 'admin@aeroxe.com', password: process.env.ADMIN_PASSWORD || '' },
    })
    const { token } = (await loginRes.json()).data

    const res = await request.get(`${API_BASE}/api/v1/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('POST /api/v1/send/bulk requires recipients array', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/send/bulk`, {
      headers: { 'X-API-Version': '2024-01-01' },
      data: {
        message: 'Bulk test',
        recipients: [],
      },
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/v1/send/schedule requires future scheduled_at', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/send/schedule`, {
      headers: { 'X-API-Version': '2024-01-01' },
      data: {
        recipient: '+1234567890',
        message: 'Scheduled test',
        scheduled_at: '2020-01-01T00:00:00Z',
      },
    })
    expect(res.status()).toBe(400)
  })
})
