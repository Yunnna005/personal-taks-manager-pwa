import { expect, test, type Page } from '@playwright/test'
import { TRIED_IN_BROWSER } from './state.ts'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

test.beforeEach(async ({ page }) => {
  // Thursday 29 October 2026, 12:00 in London (GMT)
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00Z'))
  // A share sheet can't be driven in tests, so take the download path
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined })
  })
})

const openSettings = async (page: Page) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings')
}

test('a backup exported here imports into an empty phone', async ({ page, browser }) => {
  await page.goto('/?seed')
  await openSettings(page)
  await expect(page.getByText('No backup yet')).toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('soon-backup-2026-10-29.json')
  const file = await download.path()
  await expect(page.getByText('Last backup was today')).toBeVisible()

  // A fresh browser profile stands in for a new phone
  const fresh = await browser.newContext({
    timezoneId: 'Europe/London',
    locale: 'en-GB',
    storageState: TRIED_IN_BROWSER,
  })
  const phone = await fresh.newPage()
  await phone.clock.setFixedTime(new Date('2026-10-29T12:00:00Z'))
  await phone.goto('/')
  await expect(phone.getByText('Nothing due in the next 3 days.')).toBeVisible()
  await openSettings(phone)

  await phone.getByLabel('Backup file to import').setInputFiles(file)
  const confirm = phone.getByRole('alertdialog', { name: 'Replace everything?' })
  await expect(confirm).toContainText('This backup has 13 tasks and 4 folders from 29 Oct 2026.')
  await confirm.getByRole('button', { name: 'Replace everything' }).click()
  await expect(phone.getByText('Imported 13 tasks and 4 folders')).toBeVisible()

  await phone.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(phone.getByText('8 tasks due in the next 3 days. 2 are already late.')).toBeVisible()
  await expect(phone.getByRole('button', { name: /^Errands/ })).toContainText('All done')
  await fresh.close()
})

test('a file that is not a backup is refused and nothing changes', async ({ page }) => {
  await page.goto('/?seed')
  await openSettings(page)

  await page.getByLabel('Backup file to import').setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello": "world"}'),
  })
  await expect(page.getByRole('alert')).toHaveText(
    "That file isn't a soon backup. Nothing on this phone was changed.",
  )
  await expect(page.getByRole('alertdialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByText('8 tasks due in the next 3 days. 2 are already late.')).toBeVisible()
})

test('the due-soon window changes what Home shows', async ({ page }) => {
  await page.goto('/?seed')
  await openSettings(page)
  await page.getByRole('button', { name: 'Fewer days' }).click()
  await page.getByRole('button', { name: 'Fewer days' }).click()
  await expect(page.getByText('1 day ahead')).toBeVisible()

  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByText('6 tasks due in the next day. 2 are already late.')).toBeVisible()
})

test('a chosen theme applies straight away and survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await openSettings(page)

  await page.getByText('Dark', { exact: true }).click()
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  await expect.poll(bg).toBe('rgb(20, 19, 42)')

  await page.reload()
  // Set by the inline script before the app has even loaded its settings
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(bg).toBe('rgb(20, 19, 42)')

  await page.getByText('System', { exact: true }).click()
  await expect.poll(bg).toBe('rgb(239, 240, 246)')
})

test('settings controls are at least 44px', async ({ page }) => {
  await page.goto('/?seed')
  await openSettings(page)

  for (const control of await page.locator('button, input:not(.sr-only), label').all()) {
    if (!(await control.isVisible())) continue
    const box = await control.boundingBox()
    expect(box, (await control.textContent()) ?? undefined).not.toBeNull()
    expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(44)
  }
})
