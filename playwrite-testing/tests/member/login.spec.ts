import { test, expect } from '@playwright/test'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const MEMBER_EMAIL = process.env.MEMBER_EMAIL || 'testmember@example.com'
const MEMBER_PASSWORD = process.env.MEMBER_PASSWORD || 'TestPassword123!'

test.describe('Member Login', () => {
  test('register page loads and has form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('member can register a new account', async ({ page }) => {
    await page.goto('/register')
    const uniqueEmail = `e2e-member-${Date.now()}@example.com`
    await page.fill('input[placeholder*="name" i], input[type="text"]', 'E2E Test Member')
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"]', MEMBER_PASSWORD)
    // Fill confirm password if present
    const confirmPw = page.locator('input[placeholder*="confirm" i]').first()
    if (await confirmPw.isVisible()) {
      await confirmPw.fill(MEMBER_PASSWORD)
    }
    await page.click('button[type="submit"]')
    // Should redirect to member portal
    await page.waitForURL(/\/(member|dashboard)/, { timeout: 15000 })
  })

  test('member can login and reach member portal', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', MEMBER_EMAIL)
    await page.fill('input[type="password"]', MEMBER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(member|dashboard)/, { timeout: 15000 })
  })
})
