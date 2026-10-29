import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

test('serves a manifest with installable icons', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()

  const manifest = await (await request.get(href!)).json()
  expect(manifest).toMatchObject({
    name: 'soon',
    short_name: 'soon',
    start_url: '/',
    display: 'standalone',
  })
  const purposes = manifest.icons.map((i: { purpose: string }) => i.purpose)
  expect(purposes).toEqual(expect.arrayContaining(['any', 'maskable']))
  for (const icon of [
    ...manifest.icons.map((i: { src: string }) => i.src),
    'icons/apple-touch-icon.png',
    'favicon.svg',
  ]) {
    const res = await request.get(`/${icon}`)
    expect(res.status(), icon).toBe(200)
  }
})

test('opens offline once the service worker has installed', async ({
  page,
  context,
  browserName,
}) => {
  // Playwright can only control service workers in Chromium
  test.skip(browserName !== 'chromium', 'service workers are only testable in Chromium here')

  await page.goto('/?seed')
  await expect(page.getByText('8 tasks due in the next 3 days.', { exact: false })).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // A reload puts the page under the service worker's control
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('8 tasks due in the next 3 days.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Work/ })).toBeVisible()
  await context.setOffline(false)
})

test('asks for persistent storage on start-up', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'persist() is answered without a prompt in Chromium')
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  // Chromium answers persist() by its own rules; the row must show a real answer, not "Checking…"
  await expect(page.getByText(/^(Protected|Not protected yet)$/)).toBeVisible()
})

test.describe('desktop landing', () => {
  // Start as a first-time visitor
  test.use({ storageState: { cookies: [], origins: [] } })

  test('desktop browsers see the landing page and can try the app', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'phones always get the app')
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('soon lives on your phone')
    await expect(page.getByRole('img', { name: /^QR code for http/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'iPhone' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Android' })).toBeVisible()

    await page.getByRole('button', { name: 'Try it in this browser' }).click()
    await expect(page.getByText('Due soon')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Due soon')).toBeVisible()
  })

  test('phones go straight to the app', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'desktop gets the landing page')
    await page.goto('/')
    await expect(page.getByText('Due soon')).toBeVisible()
  })
})

test('Safari on iPhone shows the install hint once', async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== 'webkit' || !isMobile, 'only iPhone Safari gets the hint')
  await page.goto('/')
  const hint = page.getByRole('region', { name: 'Install soon on this iPhone' })
  await expect(hint).toBeVisible()
  await page.getByRole('button', { name: 'Got it, hide install tip' }).click()
  await expect(hint).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Due soon')).toBeVisible()
  await expect(hint).toHaveCount(0)
})
