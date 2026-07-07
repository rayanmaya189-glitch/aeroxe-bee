# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/messages.spec.ts >> Messages API >> GET /api/v1/messages returns paginated messages
- Location: tests/api/messages.spec.ts:57:7

# Error details

```
TypeError: Cannot destructure property 'token' of '(intermediate value).data' as it is undefined.
```

# Test source

```ts
  1  | import { test, expect } from '../fixtures/helpers'
  2  | 
  3  | const API_BASE = process.env.API_URL || 'http://localhost:8080'
  4  | 
  5  | test.describe('Messages API', () => {
  6  |   test('POST /api/v1/send requires idempotency_key', async ({ request, adminApiKey }) => {
  7  |     const res = await request.post(`${API_BASE}/api/v1/send`, {
  8  |       headers: { 'X-API-Version': '2024-01-01' },
  9  |       data: {
  10 |         recipient: '+1234567890',
  11 |         message: 'Test message',
  12 |         idempotency_key: `test-${Date.now()}`,
  13 |       },
  14 |     })
  15 |     // Should succeed or fail with expected status (device offline is expected)
  16 |     expect([202, 400, 500]).toContain(res.status())
  17 |   })
  18 | 
  19 |   test('POST /api/v1/send without idempotency_key returns 400', async ({ request }) => {
  20 |     const res = await request.post(`${API_BASE}/api/v1/send`, {
  21 |       headers: { 'X-API-Version': '2024-01-01' },
  22 |       data: {
  23 |         recipient: '+1234567890',
  24 |         message: 'Test message',
  25 |       },
  26 |     })
  27 |     expect(res.status()).toBe(400)
  28 |     const json = await res.json()
  29 |     expect(json.error).toContain('idempotency_key')
  30 |   })
  31 | 
  32 |   test('POST /api/v1/send rejects message over 160 chars', async ({ request }) => {
  33 |     const res = await request.post(`${API_BASE}/api/v1/send`, {
  34 |       headers: { 'X-API-Version': '2024-01-01' },
  35 |       data: {
  36 |         recipient: '+1234567890',
  37 |         message: 'x'.repeat(161),
  38 |         idempotency_key: `test-${Date.now()}`,
  39 |       },
  40 |     })
  41 |     expect(res.status()).toBe(400)
  42 |     const json = await res.json()
  43 |     expect(json.error).toContain('160')
  44 |   })
  45 | 
  46 |   test('POST /api/v1/send requires recipient', async ({ request }) => {
  47 |     const res = await request.post(`${API_BASE}/api/v1/send`, {
  48 |       headers: { 'X-API-Version': '2024-01-01' },
  49 |       data: {
  50 |         message: 'Test message',
  51 |         idempotency_key: `test-${Date.now()}`,
  52 |       },
  53 |     })
  54 |     expect(res.status()).toBe(400)
  55 |   })
  56 | 
  57 |   test('GET /api/v1/messages returns paginated messages', async ({ request }) => {
  58 |     const loginRes = await request.post(`${API_BASE}/api/v1/auth/login`, {
  59 |       data: { email: 'admin@aeroxe.com', password: process.env.ADMIN_PASSWORD || '' },
  60 |     })
> 61 |     const { token } = (await loginRes.json()).data
     |             ^ TypeError: Cannot destructure property 'token' of '(intermediate value).data' as it is undefined.
  62 | 
  63 |     const res = await request.get(`${API_BASE}/api/v1/messages`, {
  64 |       headers: { Authorization: `Bearer ${token}` },
  65 |     })
  66 |     expect(res.ok()).toBeTruthy()
  67 |   })
  68 | 
  69 |   test('POST /api/v1/send/bulk requires recipients array', async ({ request }) => {
  70 |     const res = await request.post(`${API_BASE}/api/v1/send/bulk`, {
  71 |       headers: { 'X-API-Version': '2024-01-01' },
  72 |       data: {
  73 |         message: 'Bulk test',
  74 |         recipients: [],
  75 |       },
  76 |     })
  77 |     expect(res.status()).toBe(400)
  78 |   })
  79 | 
  80 |   test('POST /api/v1/send/schedule requires future scheduled_at', async ({ request }) => {
  81 |     const res = await request.post(`${API_BASE}/api/v1/send/schedule`, {
  82 |       headers: { 'X-API-Version': '2024-01-01' },
  83 |       data: {
  84 |         recipient: '+1234567890',
  85 |         message: 'Scheduled test',
  86 |         scheduled_at: '2020-01-01T00:00:00Z',
  87 |       },
  88 |     })
  89 |     expect(res.status()).toBe(400)
  90 |   })
  91 | })
  92 | 
```