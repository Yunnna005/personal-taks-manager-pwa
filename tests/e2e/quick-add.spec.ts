import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

test.beforeEach(async ({ page }) => {
  // Thursday 29 October 2026, 12:00 in London (GMT)
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00Z'))
})

test('adds several tasks in a row, then closes with Escape', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: 'Add a task' }).click()

  const sheet = page.getByRole('dialog', { name: 'Add a task' })
  const title = sheet.getByRole('textbox', { name: 'Task title' })
  await expect(sheet).toBeVisible()
  await expect(title).toBeFocused()

  // First: Unsorted, no date, added with Enter
  await title.fill('Fix bike light')
  await title.press('Enter')
  await expect(sheet.getByRole('status')).toHaveText('Fix bike light added')
  await expect(title).toHaveValue('')
  await expect(title).toBeFocused()

  // Second: Work, tomorrow at 09:30
  await sheet.getByRole('button', { name: 'Work' }).click()
  await sheet.getByRole('button', { name: 'Tomorrow' }).click()
  await sheet.getByRole('button', { name: 'Add time' }).click()
  await sheet.getByLabel('Time', { exact: true }).fill('09:30')
  await title.fill('Team standup')
  await sheet.getByRole('button', { name: 'Add task' }).click()
  await expect(sheet.getByRole('status')).toHaveText('Team standup added')

  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()

  await expect(page.getByText('4 tasks to sort')).toBeVisible()
  await page.getByRole('button', { name: 'See all 9' }).click()
  const card = page
    .getByRole('list', { name: 'Due soon' })
    .getByRole('listitem')
    .filter({ hasText: 'Team standup' })
  await expect(card).toContainText('09:30')
  await expect(card).toContainText('tomorrow')
  await expect(card).toContainText('Work')
})

test('closes when the dimmed background is tapped', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add your first task' }).click()
  const sheet = page.getByRole('dialog', { name: 'Add a task' })
  await expect(sheet).toBeVisible()

  await page.mouse.click(20, 20)
  await expect(sheet).toBeHidden()
})

test('sheet controls are at least 44px', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: 'Add a task' }).click()
  const sheet = page.getByRole('dialog', { name: 'Add a task' })
  await sheet.getByRole('button', { name: 'Today' }).click()

  for (const button of await sheet.getByRole('button').all()) {
    if (!(await button.isVisible())) continue
    const box = await button.boundingBox()
    expect(box, (await button.textContent()) ?? undefined).not.toBeNull()
    expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(44)
  }
})
