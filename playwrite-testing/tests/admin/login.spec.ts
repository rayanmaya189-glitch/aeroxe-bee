import { test, expect } from '@playwright/test'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@aeroxe.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''

test.describe('Admin Login', () => {
  test('landing page loads and shows features', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/AeroXe Bee/)
    // Check that features section exists
    await expect(page.locator('#features')).toBeVisible()
  })

  test('login page loads with form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('admin can login and reach dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    // Should redirect to dashboard or member portal
    await page.waitForURL(/\/(dashboard|member)/, { timeout: 10000 })
  })

  test('login with wrong credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    // Should show an error message
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 5000 })
  })

  test('register page loads with form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})
