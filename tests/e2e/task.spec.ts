import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

test.beforeEach(async ({ page }) => {
  // Thursday 29 October 2026, 12:00 in London (GMT)
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00Z'))
})

test('edits save as you type and survive a reload', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: 'See all 8' }).click()
  await page
    .getByRole('list', { name: 'Due soon' })
    .getByRole('button', { name: /Buy birthday present(?! as done)/ })
    .click()

  const title = page.getByRole('textbox', { name: 'Title' })
  await expect(title).toHaveValue('Buy birthday present')
  await expect(page.getByText('2 of 4 done')).toBeVisible()

  await title.fill('Buy Sam a present')
  await page.getByLabel('Notes', { exact: true }).fill('Likes board games')
  await page.getByLabel('Time', { exact: true }).fill('18:00')
  await page.getByLabel('New step', { exact: true }).fill('Book table')
  await page.getByLabel('New step', { exact: true }).press('Enter')
  // Tap the visible box, as a person would; the input itself is visually hidden
  await page
    .locator('label')
    .filter({ has: page.getByRole('checkbox', { name: 'Wrap it' }) })
    .click()
  await expect(page.getByText('3 of 5 done')).toBeVisible()
  await expect(page.getByRole('main').getByRole('status')).toHaveText('Saved')

  await page.reload()
  await expect(title).toHaveValue('Buy Sam a present')
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Likes board games')
  await expect(page.getByLabel('Time', { exact: true })).toHaveValue('18:00')
  await expect(page.getByText('3 of 5 done')).toBeVisible()
  await expect(page.getByText('Sat 31 Oct 18:00')).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'See all 8' }).click()
  const card = page
    .getByRole('list', { name: 'Due soon' })
    .getByRole('listitem')
    .filter({ hasText: 'Buy Sam a present' })
  await expect(card).toContainText('18:00')
  await expect(card).toContainText('3/5 steps')
})

test('typing then going straight back still saves', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: /^Work/ }).click()
  await page.getByRole('button', { name: /Plan holiday(?! as done)/ }).click()

  await page.getByRole('textbox', { name: 'Title' }).fill('Plan summer holiday')
  await page.getByRole('button', { name: 'Back' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Work')
  await expect(page.getByRole('list', { name: 'No date' })).toContainText('Plan summer holiday')
})

test('marks done, then deletes the task', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: /Dentist(?! as done)/ }).click()

  await page.getByRole('button', { name: 'Mark as done' }).click()
  await expect(page.getByRole('button', { name: 'Mark as not done' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete task' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thursday 29 October')
  await expect(page.getByText('Dentist')).toHaveCount(0)
})

test('task page controls are at least 44px', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: 'See all 8' }).click()
  await page.getByRole('button', { name: /Buy birthday present(?! as done)/ }).click()
  await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible()

  // Visually hidden inputs are reached through their 44px labels, so skip them
  for (const control of await page.locator('button, input:not(.sr-only), select').all()) {
    if (!(await control.isVisible())) continue
    const box = await control.boundingBox()
    expect(box, (await control.getAttribute('aria-label')) ?? undefined).not.toBeNull()
    expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(44)
  }
})
