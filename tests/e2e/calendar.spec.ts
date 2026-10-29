import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

test.beforeEach(async ({ page }) => {
  // Thursday 29 October 2026, 12:00 in London (GMT)
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00Z'))
})

test('hours stay on the left and days stay on top while the week scrolls', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: 'Calendar view' }).click()
  const week = page.getByRole('region', { name: 'Week of 26 Oct – 1 Nov' })
  await expect(page.getByText('Dentist')).toBeVisible()

  const hours = page.getByText('12:00', { exact: true })
  const thursday = page.getByRole('button', { name: /^Thursday 29 October/ })
  const before = { hours: (await hours.boundingBox())!, day: (await thursday.boundingBox())! }

  await week.evaluate((el) => el.scrollBy(400, 300))
  await expect.poll(async () => (await hours.boundingBox())!.x).toBeCloseTo(before.hours.x, 0)
  await expect.poll(async () => (await thursday.boundingBox())!.y).toBeCloseTo(before.day.y, 0)
})

test('the calendar can be the first page, and remembers the week on the way back', async ({
  page,
}) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByText('Calendar', { exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Calendar' })).toBeChecked()

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('26 Oct – 1 Nov')
  await page.getByRole('button', { name: 'Next week' }).click()
  await page.getByRole('button', { name: 'Renew passport' }).click()
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Renew passport')
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('2 Nov – 8 Nov')
})

test('touch targets are at least 44px', async ({ page }) => {
  await page.goto('/?seed')
  await page.getByRole('button', { name: 'Calendar view' }).click()
  await expect(page.getByText('Dentist')).toBeVisible()

  for (const button of await page.getByRole('button').all()) {
    const box = await button.boundingBox()
    expect(box, (await button.textContent()) ?? undefined).not.toBeNull()
    expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(44)
  }
})
