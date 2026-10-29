import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

test.beforeEach(async ({ page }) => {
  // Thursday 29 October 2026, 12:00 in London (GMT)
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00Z'))
})

const completed = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /^Completed/ })

test('Home has no backup nudge', async ({ page }) => {
  await page.goto('/?seed')
  await expect(page.getByText('Due soon')).toBeVisible()
  await expect(page.getByText('No backup yet')).toHaveCount(0)
})

test('Completed appears with done tasks, and Delete all clears and hides it', async ({ page }) => {
  await page.goto('/?seed')
  // The sample data has 3 completed tasks
  await expect(completed(page)).toContainText('3 tasks done')

  await page.getByRole('button', { name: 'Mark Pay rent as done' }).click()
  await expect(completed(page)).toContainText('4 tasks done')

  await completed(page).click()
  const list = page.getByRole('list', { name: 'Completed tasks' })
  await expect(list.getByRole('listitem')).toHaveCount(4)
  // The test clock is frozen, so all completions share a time; check content, not order
  await expect(list.getByRole('listitem').filter({ hasText: 'Pay rent' })).toContainText('Home')

  await page.getByRole('button', { name: 'Delete all' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Delete 4 completed tasks?' })
  await confirm.getByRole('button', { name: 'Delete all' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thursday 29 October')
  await expect(page.locator('.toast')).toHaveText(/4 completed tasks deleted\s*Undo/)
  await expect(completed(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Errands/ })).toContainText('No tasks yet')

  // Undo puts them all back
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(completed(page)).toContainText('4 tasks done')

  // Completing a task after clearing brings Completed back
  await completed(page).click()
  await page.getByRole('button', { name: 'Delete all' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete all' }).click()
  await expect(completed(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Mark Dentist as done' }).click()
  await expect(completed(page)).toContainText('1 task done')
})
