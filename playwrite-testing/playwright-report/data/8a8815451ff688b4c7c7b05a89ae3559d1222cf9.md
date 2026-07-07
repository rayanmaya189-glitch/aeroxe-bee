# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/admin.spec.ts >> Admin API >> GET /api/v1/admin/dead-letters lists dead letters
- Location: tests/api/admin.spec.ts:41:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: undefined
```

# Test source

```ts
  1   | import { test as base, expect, type APIRequestContext } from '@playwright/test'
  2   | 
  3   | const API_BASE = process.env.API_URL || 'http://localhost:8080'
  4   | 
  5   | // ── Test data ──────────────────────────────────────────────
  6   | export const TEST_ADMIN = {
  7   |   email: process.env.ADMIN_EMAIL || 'admin@aeroxe.com',
  8   |   password: process.env.ADMIN_PASSWORD || '',
  9   | }
  10  | 
  11  | export const TEST_MEMBER = {
  12  |   email: process.env.MEMBER_EMAIL || 'testmember@example.com',
  13  |   password: process.env.MEMBER_PASSWORD || 'TestPassword123!',
  14  |   name: 'Test Member',
  15  | }
  16  | 
  17  | // ── API Helpers ────────────────────────────────────────────
  18  | 
  19  | /** Register a new account via API and return the token. */
  20  | export async function registerAccount(
  21  |   request: APIRequestContext,
  22  |   data: { name: string; email: string; password: string },
  23  | ): Promise<{ token: string; refreshToken: string; user: { id: string; email: string } }> {
  24  |   const res = await request.post(`${API_BASE}/api/v1/auth/register`, { data })
  25  |   const json = await res.json()
  26  |   expect(json.success).toBeTruthy()
  27  |   return { token: json.data.token, refreshToken: json.data.refreshToken, user: json.data.user }
  28  | }
  29  | 
  30  | /** Login via API and return the token. */
  31  | export async function loginAccount(
  32  |   request: APIRequestContext,
  33  |   data: { email: string; password: string },
  34  | ): Promise<{ token: string; refreshToken: string }> {
  35  |   const res = await request.post(`${API_BASE}/api/v1/auth/login`, { data })
  36  |   const json = await res.json()
> 37  |   expect(json.success).toBeTruthy()
      |                        ^ Error: expect(received).toBeTruthy()
  38  |   return { token: json.data.token, refreshToken: json.data.refreshToken }
  39  | }
  40  | 
  41  | /** Create an API key via API. */
  42  | export async function createApiKey(
  43  |   request: APIRequestContext,
  44  |   token: string,
  45  |   label: string = 'test-key',
  46  | ): Promise<{ id: string; api_key: string }> {
  47  |   const res = await request.post(`${API_BASE}/api/v1/account/api-keys`, {
  48  |     headers: { Authorization: `Bearer ${token}` },
  49  |     data: { label, scopes: ['send', 'messages'] },
  50  |   })
  51  |   const json = await res.json()
  52  |   expect(json.success).toBeTruthy()
  53  |   return { id: json.data.id, api_key: json.data.api_key }
  54  | }
  55  | 
  56  | /** Send an SMS via API using an API key. */
  57  | export async function sendSms(
  58  |   request: APIRequestContext,
  59  |   apiKey: string,
  60  |   data: { recipient: string; message: string; message_type?: string; idempotency_key?: string; device_id?: string },
  61  | ): Promise<{ message_id: string; status: string }> {
  62  |   const payload = {
  63  |     ...data,
  64  |     message_type: data.message_type || 'transactional',
  65  |     idempotency_key: data.idempotency_key || `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  66  |   }
  67  |   const res = await request.post(`${API_BASE}/api/v1/send`, {
  68  |     headers: {
  69  |       'X-API-Key': apiKey,
  70  |       'X-API-Version': '2024-01-01',
  71  |     },
  72  |     data: payload,
  73  |   })
  74  |   const json = await res.json()
  75  |   return { message_id: json.data?.message_id || '', status: json.data?.status || '' }
  76  | }
  77  | 
  78  | /** Clean up: delete an API key. */
  79  | export async function deleteApiKey(request: APIRequestContext, token: string, keyId: string): Promise<void> {
  80  |   await request.delete(`${API_BASE}/api/v1/account/api-keys/${keyId}`, {
  81  |     headers: { Authorization: `Bearer ${token}` },
  82  |   })
  83  | }
  84  | 
  85  | // ── Extended Test Fixtures ─────────────────────────────────
  86  | 
  87  | type Fixtures = {
  88  |   adminToken: string
  89  |   memberToken: string
  90  |   adminApiKey: string
  91  | }
  92  | 
  93  | export const test = base.extend<Fixtures>({
  94  |   adminToken: async ({ request }, use) => {
  95  |     const { token } = await loginAccount(request, TEST_ADMIN)
  96  |     await use(token)
  97  |   },
  98  | 
  99  |   memberToken: async ({ request }, use) => {
  100 |     // Register or login member
  101 |     try {
  102 |       const { token } = await loginAccount(request, { email: TEST_MEMBER.email, password: TEST_MEMBER.password })
  103 |       await use(token)
  104 |     } catch {
  105 |       const { token } = await registerAccount(request, TEST_MEMBER)
  106 |       await use(token)
  107 |     }
  108 |   },
  109 | 
  110 |   adminApiKey: async ({ request, adminToken }, use) => {
  111 |     const { id, api_key } = await createApiKey(request, adminToken, `test-${Date.now()}`)
  112 |     await use(api_key)
  113 |     // Cleanup: delete the API key after test
  114 |     await deleteApiKey(request, adminToken, id).catch(() => {})
  115 |   },
  116 | })
  117 | 
  118 | export { expect }
  119 | 
```