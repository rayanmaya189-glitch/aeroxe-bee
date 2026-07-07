import { test, expect } from '@playwright/test'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const MEMBER_EMAIL = process.env.MEMBER_EMAIL || 'testmember@example.com'
const MEMBER_PASSWORD = process.env.MEMBER_PASSWORD || 'TestPassword123!'

async function loginAsMember(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', MEMBER_EMAIL)
  await page.fill('input[type="password"]', MEMBER_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(member|dashboard)/, { timeout: 15000 })
}

test.describe('Member Portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMember(page)
  })

  test('member dashboard loads', async ({ page }) => {
    await page.goto('/member')
    await expect(page.locator('text=/dashboard|welcome|overview/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('member devices page loads', async ({ page }) => {
    await page.goto('/member/devices')
    await expect(page.locator('text=/device/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('member messages page loads', async ({ page }) => {
    await page.goto('/member/messages')
    await expect(page.locator('text=/message/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('member send SMS page loads', async ({ page }) => {
    await page.goto('/member/send')
    await expect(page.locator('text=/send|sms|message/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('member bulk SMS page loads', async ({ page }) => {
    await page.goto('/member/bulk-sms')
    await expect(page.locator('text=/bulk|sms|message/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('member analytics page loads', async ({ page }) => {
    await page.goto('/member/analytics')
    await expect(page.locator('text=/analytics|chart/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('member templates page loads', async ({ page }) => {
    await page.goto('/member/templates')
    await expect(page.locator('text=/template/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('member webhooks page loads', async ({ page }) => {
    await page.goto('/member/webhooks')
    await expect(page.locator('text=/webhook/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('member upgrade page loads', async ({ page }) => {
    await page.goto('/member/upgrade')
    await expect(page.locator('text=/upgrade|plan/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('member payment requests page loads', async ({ page }) => {
    await page.goto('/member/payment-requests')
    await expect(page.locator('text=/payment|request/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('member subscription requests page loads', async ({ page }) => {
    await page.goto('/member/subscription-requests')
    await expect(page.locator('text=/subscri|request/i').first()).toBeVisible({ timeout: 10000 })
  })
})
