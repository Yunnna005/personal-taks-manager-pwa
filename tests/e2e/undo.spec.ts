import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

test.beforeEach(async ({ page }) => {
  // Thursday 29 October 2026, 12:00 in London (GMT)
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00Z'))
})

test('ticking shows a toast above the add bar, and Undo brings the task back', async ({ page }) => {
  await page.goto('/?seed')
  const dueSoon = page.getByRole('list', { name: 'Due soon' })
  await page.getByRole('button', { name: 'Mark Pay rent as done' }).click()

  const toast = page.locator('.toast')
  await expect(toast).toHaveText(/Pay rent done\s*Undo/)
  await expect(dueSoon).not.toContainText('Pay rent')

  // Sits above the add bar, not on top of it
  const toastBox = (await toast.boundingBox())!
  const barBox = (await page.getByRole('button', { name: 'Add a task' }).boundingBox())!
  expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(barBox.y)

  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(toast).toHaveCount(0)
  await expect(dueSoon.getByRole('listitem').first()).toContainText('Pay rent')
})

test('the toast goes away by itself after about 5 seconds', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: 'Mark Dentist as done' }).click()
  const toast = page.locator('.toast')
  await expect(toast).toBeVisible()
  await expect(toast).toHaveCount(0, { timeout: 7000 })
})

test('deleting on the Task page can be undone from the screen you return to', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: /Dentist(?! as done)/ }).click()
  await page.getByRole('button', { name: 'Delete task' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thursday 29 October')
  await expect(page.locator('.toast')).toHaveText(/Task deleted\s*Undo/)
  await expect(page.getByText('Dentist')).toHaveCount(0)

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('list', { name: 'Due soon' })).toContainText('Dentist')
})

test('Show completed lists finished tasks and can reopen one', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: /^Errands/ }).click()
  await expect(page.getByText('Everything here is done.')).toBeVisible()

  await page.getByRole('button', { name: 'Show completed (2)' }).click()
  const completed = page.getByRole('list', { name: 'Completed' })
  await expect(completed.getByRole('listitem')).toHaveCount(2)

  await completed.getByRole('button', { name: 'Mark Post parcel as not done' }).click()
  await expect(page.getByRole('list', { name: 'No date' })).toContainText('Post parcel')
  await expect(page.getByRole('button', { name: 'Hide completed (1)' })).toBeVisible()
  await expect(page.getByText('1 left · 1 of 2 done')).toBeVisible()
})
