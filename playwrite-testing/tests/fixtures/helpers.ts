import { test as base, expect, type APIRequestContext } from '@playwright/test'

const API_BASE = process.env.API_URL || 'http://localhost:8080'

// ── Test data ──────────────────────────────────────────────
export const TEST_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@aeroxe.com',
  password: process.env.ADMIN_PASSWORD || '',
}

export const TEST_MEMBER = {
  email: process.env.MEMBER_EMAIL || 'testmember@example.com',
  password: process.env.MEMBER_PASSWORD || 'TestPassword123!',
  name: 'Test Member',
}

// ── API Helpers ────────────────────────────────────────────

/** Register a new account via API and return the token. */
export async function registerAccount(
  request: APIRequestContext,
  data: { name: string; email: string; password: string },
): Promise<{ token: string; refreshToken: string; user: { id: string; email: string } }> {
  const res = await request.post(`${API_BASE}/api/v1/auth/register`, { data })
  const json = await res.json()
  expect(json.success).toBeTruthy()
  return { token: json.data.token, refreshToken: json.data.refreshToken, user: json.data.user }
}

/** Login via API and return the token. */
export async function loginAccount(
  request: APIRequestContext,
  data: { email: string; password: string },
): Promise<{ token: string; refreshToken: string }> {
  const res = await request.post(`${API_BASE}/api/v1/auth/login`, { data })
  const json = await res.json()
  expect(json.success).toBeTruthy()
  return { token: json.data.token, refreshToken: json.data.refreshToken }
}

/** Create an API key via API. */
export async function createApiKey(
  request: APIRequestContext,
  token: string,
  label: string = 'test-key',
): Promise<{ id: string; api_key: string }> {
  const res = await request.post(`${API_BASE}/api/v1/account/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { label, scopes: ['send', 'messages'] },
  })
  const json = await res.json()
  expect(json.success).toBeTruthy()
  return { id: json.data.id, api_key: json.data.api_key }
}

/** Send an SMS via API using an API key. */
export async function sendSms(
  request: APIRequestContext,
  apiKey: string,
  data: { recipient: string; message: string; message_type?: string; idempotency_key?: string; device_id?: string },
): Promise<{ message_id: string; status: string }> {
  const payload = {
    ...data,
    message_type: data.message_type || 'transactional',
    idempotency_key: data.idempotency_key || `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }
  const res = await request.post(`${API_BASE}/api/v1/send`, {
    headers: {
      'X-API-Key': apiKey,
      'X-API-Version': '2024-01-01',
    },
    data: payload,
  })
  const json = await res.json()
  return { message_id: json.data?.message_id || '', status: json.data?.status || '' }
}

/** Clean up: delete an API key. */
export async function deleteApiKey(request: APIRequestContext, token: string, keyId: string): Promise<void> {
  await request.delete(`${API_BASE}/api/v1/account/api-keys/${keyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ── Extended Test Fixtures ─────────────────────────────────

type Fixtures = {
  adminToken: string
  memberToken: string
  adminApiKey: string
}

export const test = base.extend<Fixtures>({
  adminToken: async ({ request }, use) => {
    const { token } = await loginAccount(request, TEST_ADMIN)
    await use(token)
  },

  memberToken: async ({ request }, use) => {
    // Register or login member
    try {
      const { token } = await loginAccount(request, { email: TEST_MEMBER.email, password: TEST_MEMBER.password })
      await use(token)
    } catch {
      const { token } = await registerAccount(request, TEST_MEMBER)
      await use(token)
    }
  },

  adminApiKey: async ({ request, adminToken }, use) => {
    const { id, api_key } = await createApiKey(request, adminToken, `test-${Date.now()}`)
    await use(api_key)
    // Cleanup: delete the API key after test
    await deleteApiKey(request, adminToken, id).catch(() => {})
  },
})

export { expect }
