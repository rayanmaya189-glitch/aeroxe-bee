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

test.describe('Admin Webhooks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('webhooks page loads with empty state or list', async ({ page }) => {
    await page.goto('/webhooks')
    await page.waitForTimeout(2000)
    // Should show webhook page content
    const hasContent = await page.locator('text=/webhook|empty|no webhook/i').first().isVisible({ timeout: 10000 })
    expect(hasContent).toBeTruthy()
  })

  test('templates page loads with empty state or list', async ({ page }) => {
    await page.goto('/templates')
    await page.waitForTimeout(2000)
    const hasContent = await page.locator('text=/template|empty|no template/i').first().isVisible({ timeout: 10000 })
    expect(hasContent).toBeTruthy()
  })
})
