# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/auth.spec.ts >> Auth API >> POST /api/v1/auth/refresh returns new tokens
- Location: tests/api/auth.spec.ts:55:7

# Error details

```
TypeError: Cannot read properties of undefined (reading 'refreshToken')
```

# Test source

```ts
  1  | import { test, expect, type APIRequestContext } from '../fixtures/helpers'
  2  | 
  3  | const API_BASE = process.env.API_URL || 'http://localhost:8080'
  4  | 
  5  | test.describe('Auth API', () => {
  6  |   test('POST /api/v1/health returns healthy', async ({ request }) => {
  7  |     const res = await request.get(`${API_BASE}/api/v1/health`)
  8  |     expect(res.ok()).toBeTruthy()
  9  |     const json = await res.json()
  10 |     expect(json.success).toBeTruthy()
  11 |   })
  12 | 
  13 |   test('POST /api/v1/auth/login with valid credentials returns token', async ({ request }) => {
  14 |     const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
  15 |       data: { email: 'admin@aeroxe.com', password: process.env.ADMIN_PASSWORD || '' },
  16 |     })
  17 |     const json = await res.json()
  18 |     expect(json.success).toBeTruthy()
  19 |     expect(json.data.token).toBeTruthy()
  20 |     expect(json.data.refreshToken).toBeTruthy()
  21 |   })
  22 | 
  23 |   test('POST /api/v1/auth/login with invalid credentials returns 401', async ({ request }) => {
  24 |     const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
  25 |       data: { email: 'wrong@example.com', password: 'wrongpassword' },
  26 |     })
  27 |     expect(res.status()).toBe(401)
  28 |   })
  29 | 
  30 |   test('POST /api/v1/auth/register creates a new account', async ({ request }) => {
  31 |     const uniqueEmail = `testuser-${Date.now()}@example.com`
  32 |     const res = await request.post(`${API_BASE}/api/v1/auth/register`, {
  33 |       data: { name: 'Test User', email: uniqueEmail, password: 'TestPass123!' },
  34 |     })
  35 |     const json = await res.json()
  36 |     expect(json.success).toBeTruthy()
  37 |     expect(json.data.token).toBeTruthy()
  38 |     expect(json.data.user.email).toBe(uniqueEmail)
  39 |   })
  40 | 
  41 |   test('GET /api/v1/auth/profile returns user profile with valid token', async ({ request, adminToken }) => {
  42 |     const res = await request.get(`${API_BASE}/api/v1/auth/profile`, {
  43 |       headers: { Authorization: `Bearer ${adminToken}` },
  44 |     })
  45 |     const json = await res.json()
  46 |     expect(json.success).toBeTruthy()
  47 |     expect(json.data.email).toBeTruthy()
  48 |   })
  49 | 
  50 |   test('GET /api/v1/auth/profile returns 401 without token', async ({ request }) => {
  51 |     const res = await request.get(`${API_BASE}/api/v1/auth/profile`)
  52 |     expect(res.status()).toBe(401)
  53 |   })
  54 | 
  55 |   test('POST /api/v1/auth/refresh returns new tokens', async ({ request }) => {
  56 |     const loginRes = await request.post(`${API_BASE}/api/v1/auth/login`, {
  57 |       data: { email: 'admin@aeroxe.com', password: process.env.ADMIN_PASSWORD || '' },
  58 |     })
  59 |     const loginJson = await loginRes.json()
> 60 |     const refreshToken = loginJson.data.refreshToken
     |                                         ^ TypeError: Cannot read properties of undefined (reading 'refreshToken')
  61 | 
  62 |     const res = await request.post(`${API_BASE}/api/v1/auth/refresh`, {
  63 |       data: { refresh_token: refreshToken },
  64 |     })
  65 |     const json = await res.json()
  66 |     expect(json.success).toBeTruthy()
  67 |     expect(json.data.token).toBeTruthy()
  68 |   })
  69 | })
  70 | 
```