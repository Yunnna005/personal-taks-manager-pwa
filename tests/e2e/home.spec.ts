import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

test.beforeEach(async ({ page }) => {
  // Thursday 29 October 2026, 12:00 in London (GMT)
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00Z'))
})

test('first run shows the empty state', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thursday 29 October')
  await expect(page.getByText('Nothing due in the next 3 days.')).toBeVisible()
  await expect(page.getByText('Nothing to sort')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add your first task' })).toBeVisible()
})

test('shows due tasks and folders, and ticking a task removes it', async ({ page }) => {
  await page.goto('/?seed')
  const dueSoon = page.getByRole('list', { name: 'Due soon' })

  await expect(page.getByText('8 tasks due in the next 3 days. 2 are already late.')).toBeVisible()
  await expect(dueSoon.getByRole('listitem')).toHaveCount(5)
  await expect(dueSoon.getByRole('listitem').first()).toContainText('Pay rent')

  await page.getByRole('button', { name: 'See all 8' }).click()
  await expect(dueSoon.getByRole('listitem')).toHaveCount(8)

  await page.getByRole('button', { name: 'Mark Pay rent as done' }).click()
  await expect(dueSoon.getByRole('listitem')).toHaveCount(7)
  await expect(page.getByText('7 tasks due in the next 3 days. One is already late.')).toBeVisible()

  const errands = page.getByRole('listitem').filter({ hasText: 'Errands' })
  await expect(errands).toContainText('All done')
  await expect(page.getByText('3 tasks to sort')).toBeVisible()
})

test('touch targets are at least 44px', async ({ page }) => {
  await page.goto('/?seed')
  await expect(page.getByRole('list', { name: 'Due soon' })).toBeVisible()

  for (const button of await page.getByRole('button').all()) {
    const box = await button.boundingBox()
    expect(box, (await button.textContent()) ?? undefined).not.toBeNull()
    expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(44)
  }
})
