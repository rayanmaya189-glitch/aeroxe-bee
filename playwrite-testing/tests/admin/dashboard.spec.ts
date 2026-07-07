import { test, expect } from '@playwright/test'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@aeroxe.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|member)/, { timeout: 15000 })
}

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('dashboard page loads with stats', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('text=/dashboard|stats|overview/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('accounts page loads', async ({ page }) => {
    await page.goto('/accounts')
    await expect(page.locator('text=/account/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('users page loads', async ({ page }) => {
    await page.goto('/users')
    await expect(page.locator('text=/user/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('plans page loads', async ({ page }) => {
    await page.goto('/plans')
    await expect(page.locator('text=/plan/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('webhooks page loads', async ({ page }) => {
    await page.goto('/webhooks')
    await expect(page.locator('text=/webhook/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('templates page loads', async ({ page }) => {
    await page.goto('/templates')
    await expect(page.locator('text=/template/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('analytics page loads', async ({ page }) => {
    await page.goto('/analytics')
    await expect(page.locator('text=/analytics|chart/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('billing page loads', async ({ page }) => {
    await page.goto('/billing')
    await expect(page.locator('text=/billing|plan/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('text=/setting|preference/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('circuit breakers page loads', async ({ page }) => {
    await page.goto('/circuit-breakers')
    await expect(page.locator('text=/circuit/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('dead letters page loads', async ({ page }) => {
    await page.goto('/dead-letters')
    await expect(page.locator('text=/dead|letter/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('fraud flags page loads', async ({ page }) => {
    await page.goto('/fraud-flags')
    await expect(page.locator('text=/fraud/i').first()).toBeVisible({ timeout: 10000 })
  })
})
