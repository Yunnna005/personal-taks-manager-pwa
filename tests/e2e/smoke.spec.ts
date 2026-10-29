import { expect, test } from '@playwright/test'

test('loads the app with the wordmark and date', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('soon')
  await expect(page.getByText('soon', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
