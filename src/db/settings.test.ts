import { db, DEFAULT_SETTINGS, type StartView, type Theme } from './schema.ts'
import { getSettings, setSetting } from './settings.ts'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('settings', () => {
  it('returns defaults when nothing is saved', async () => {
    expect(await getSettings()).toEqual({
      dueSoonDays: 3,
      theme: 'system',
      startView: 'list',
      lastBackupAt: null,
      installHintDismissed: false,
    })
  })

  it('saves and reads back each setting', async () => {
    await setSetting('dueSoonDays', 7)
    await setSetting('theme', 'dark')
    await setSetting('startView', 'calendar')
    await setSetting('lastBackupAt', '2026-10-15T08:00:00.000Z')
    await setSetting('installHintDismissed', true)

    expect(await getSettings()).toEqual({
      dueSoonDays: 7,
      theme: 'dark',
      startView: 'calendar',
      lastBackupAt: '2026-10-15T08:00:00.000Z',
      installHintDismissed: true,
    })
  })

  it.each([0, 8, 2.5, Number.NaN])('rejects dueSoonDays = %s', async (n) => {
    await expect(setSetting('dueSoonDays', n)).rejects.toThrow('dueSoonDays')
    expect((await getSettings()).dueSoonDays).toBe(3)
  })

  it('rejects unknown themes and bad backup dates', async () => {
    await expect(setSetting('theme', 'blue' as Theme)).rejects.toThrow('Unknown theme')
    await expect(setSetting('startView', 'grid' as StartView)).rejects.toThrow('Unknown start view')
    await expect(setSetting('lastBackupAt', 'yesterday')).rejects.toThrow('lastBackupAt')
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('ignores stray keys in storage', async () => {
    await db.settings.put({ key: 'oldSetting' as 'theme', value: 'light' })
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
