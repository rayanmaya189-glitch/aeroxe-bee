import { test, expect } from '../fixtures/helpers'

const API_BASE = process.env.API_URL || 'http://localhost:8080'

test.describe('Member Portal API', () => {
  test('GET /api/v1/member/dashboard requires auth', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/member/dashboard`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/member/dashboard returns dashboard data', async ({ request, memberToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/member/dashboard`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.success).toBeTruthy()
  })

  test('GET /api/v1/member/devices returns devices', async ({ request, memberToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/member/devices`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/member/messages returns messages', async ({ request, memberToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/member/messages`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/member/analytics returns analytics', async ({ request, memberToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/member/analytics`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/member/stats returns stats', async ({ request, memberToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/member/stats`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/member/plan returns plan info', async ({ request, memberToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/member/plan`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/member/templates returns templates', async ({ request, memberToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/member/templates`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/member/webhooks returns webhooks', async ({ request, memberToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/member/webhooks`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('GET /api/v1/member/preferences returns preferences', async ({ request, memberToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/member/preferences`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })
})
