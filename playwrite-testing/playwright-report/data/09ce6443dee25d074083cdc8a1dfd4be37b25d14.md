# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/billing.spec.ts >> Billing API >> GET /api/v1/public/plans returns plans without auth
- Location: tests/api/billing.spec.ts:6:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | import { test, expect } from '../fixtures/helpers'
  2  | 
  3  | const API_BASE = process.env.API_URL || 'http://localhost:8080'
  4  | 
  5  | test.describe('Billing API', () => {
  6  |   test('GET /api/v1/public/plans returns plans without auth', async ({ request }) => {
  7  |     const res = await request.get(`${API_BASE}/api/v1/public/plans`)
  8  |     expect(res.ok()).toBeTruthy()
  9  |     const json = await res.json()
  10 |     expect(json.success).toBeTruthy()
> 11 |     expect(Array.isArray(json.data)).toBeTruthy()
     |                                      ^ Error: expect(received).toBeTruthy()
  12 |   })
  13 | 
  14 |   test('GET /api/v1/plans returns plans with auth', async ({ request, adminToken }) => {
  15 |     const res = await request.get(`${API_BASE}/api/v1/plans`, {
  16 |       headers: { Authorization: `Bearer ${adminToken}` },
  17 |     })
  18 |     expect(res.ok()).toBeTruthy()
  19 |     const json = await res.json()
  20 |     expect(json.success).toBeTruthy()
  21 |   })
  22 | 
  23 |   test('GET /api/v1/public/payment-methods returns payment methods', async ({ request }) => {
  24 |     const res = await request.get(`${API_BASE}/api/v1/public/payment-methods`)
  25 |     expect(res.ok()).toBeTruthy()
  26 |   })
  27 | 
  28 |   test('POST /api/v1/plans requires admin auth', async ({ request }) => {
  29 |     const res = await request.post(`${API_BASE}/api/v1/plans`, {
  30 |       data: { id: 'test', name: 'Test Plan' },
  31 |     })
  32 |     expect(res.status()).toBe(401)
  33 |   })
  34 | 
  35 |   test('GET /api/v1/billing/usage returns usage with auth', async ({ request, adminToken }) => {
  36 |     const res = await request.get(`${API_BASE}/api/v1/billing/usage`, {
  37 |       headers: { Authorization: `Bearer ${adminToken}` },
  38 |     })
  39 |     expect(res.ok()).toBeTruthy()
  40 |   })
  41 | })
  42 | 
```