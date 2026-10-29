import { expect, test, type Page } from '@playwright/test'

test.use({ timezoneId: 'Europe/London', locale: 'en-GB' })

test.beforeEach(async ({ page }) => {
  // Thursday 29 October 2026, 12:00 in London (GMT)
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00Z'))
})

const tile = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name}`) })

test('create a folder, add to it, rename it and delete it', async ({ page }) => {
  await page.goto('/')

  // Create
  await page.getByRole('button', { name: 'New folder' }).click()
  const editor = page.getByRole('dialog', { name: 'New folder' })
  await expect(editor.getByLabel('Name')).toBeFocused()
  await editor.getByLabel('Name').fill('Garden')
  await editor.locator('label', { hasText: 'Mint' }).click()
  await expect(editor.getByRole('radio', { name: 'Mint' })).toBeChecked()
  await editor.getByRole('button', { name: 'Create folder' }).click()
  await expect(editor).toBeHidden()

  // Open and add a task through the folder's add bar
  await tile(page, 'Garden').click()
  await expect(page).toHaveURL(/#\/folder\//)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Garden')
  await page.getByRole('button', { name: 'Add to Garden' }).click()
  const add = page.getByRole('dialog', { name: 'Add a task' })
  await add.getByRole('textbox', { name: 'Task title' }).fill('Mow the lawn')
  await add.getByRole('button', { name: 'Tomorrow' }).click()
  await add.getByRole('button', { name: 'Add task' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('list', { name: 'With a due date' })).toContainText('Mow the lawn')
  await expect(page.getByText('1 left · 0 of 1 done')).toBeVisible()

  // Rename through the options sheet
  await page.getByRole('button', { name: 'Folder options' }).click()
  await page.getByRole('button', { name: 'Rename folder' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit folder' })
  await expect(edit.getByLabel('Name')).toBeFocused()
  await edit.getByLabel('Name').fill('Allotment')
  await edit.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Allotment')
  await expect(page.getByRole('button', { name: 'Add to Allotment' })).toBeVisible()

  // Delete, confirming
  await page.getByRole('button', { name: 'Folder options' }).click()
  await page.getByRole('button', { name: 'Delete folder' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Delete Allotment?' })
  await expect(confirm).toContainText('Its 1 open task will move to Unsorted.')
  await confirm.getByRole('button', { name: 'Delete folder' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thursday 29 October')
  await expect(tile(page, 'Allotment')).toHaveCount(0)
  await expect(page.getByText('1 task to sort')).toBeVisible()
})

test('back button, browser back and reload all behave', async ({ page }) => {
  await page.goto('/?seed')

  await tile(page, 'Work').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Work')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thursday 29 October')

  await tile(page, 'Unsorted').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unsorted')
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thursday 29 October')

  // Opened straight onto a folder: Back still lands on Home
  await tile(page, 'Health').click()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Health')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thursday 29 October')
})

test('folder screen controls are at least 44px', async ({ page }) => {
  await page.goto('/?seed')
  await tile(page, 'Work').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Work')

  const check = async () => {
    for (const button of await page.getByRole('button').all()) {
      if (!(await button.isVisible())) continue
      const box = await button.boundingBox()
      expect(box, (await button.textContent()) ?? undefined).not.toBeNull()
      expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(44)
    }
  }
  await check()
  await page.getByRole('button', { name: 'Folder options' }).click()
  await check()
})
