import { test, expect } from '../fixtures/helpers'

const API_BASE = process.env.API_URL || 'http://localhost:8080'

test.describe('Devices API', () => {
  test('GET /api/v1/devices requires auth', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/v1/devices`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/v1/devices lists devices with auth', async ({ request, adminToken }) => {
    const res = await request.get(`${API_BASE}/api/v1/devices`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('POST /api/v1/devices/register requires account_token', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/devices/register`, {
      data: { device_id: 'test-device' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/v1/devices/deregister requires auth', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/devices/deregister`, {
      data: { device_id: 'test-device' },
    })
    expect(res.status()).toBe(401)
  })
})
