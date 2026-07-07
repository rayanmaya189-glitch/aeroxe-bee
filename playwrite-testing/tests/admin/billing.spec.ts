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

test.describe('Admin Billing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('plans page shows plan cards', async ({ page }) => {
    await page.goto('/plans')
    await page.waitForTimeout(2000)
    // Should show at least one plan card or empty state
    const hasCards = await page.locator('text=/plan|create/i').first().isVisible({ timeout: 10000 })
    expect(hasCards).toBeTruthy()
  })

  test('feature catalog page loads', async ({ page }) => {
    await page.goto('/feature-catalog')
    await expect(page.locator('text=/feature|catalog/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('billing settings page loads', async ({ page }) => {
    await page.goto('/billing-settings')
    await expect(page.locator('text=/billing|payment|setting/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('subscriptions page loads', async ({ page }) => {
    await page.goto('/admin/subscriptions')
    await expect(page.locator('text=/subscri/i').first()).toBeVisible({ timeout: 10000 })
  })
})
