// Sample data for development and e2e tests only. main.tsx loads this when
// the URL has ?seed, and only in dev or e2e builds, so it never ships.
import { addDays, toDateString } from '../lib/dates.ts'
import { createFolder } from './folders.ts'
import { db } from './schema.ts'
import { addStep, addTask, completeTask, toggleStep } from './tasks.ts'

export async function seedSampleData(now: Date): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()))
  const day = (n: number) => addDays(toDateString(now), n)

  const work = await createFolder('Work', 'sky')
  const home = await createFolder('Home', 'mint')
  const health = await createFolder('Health', 'peach')
  const errands = await createFolder('Errands', 'butter')

  await addTask({ title: 'Pay rent', folderId: home.id, dueDate: day(-2) })
  await addTask({ title: 'Reply to landlord', dueDate: day(0), dueTime: '09:00' })
  await addTask({ title: 'Send invoice', folderId: work.id, dueDate: day(0), dueTime: '17:00' })
  await addTask({ title: 'Water the plants', folderId: home.id, dueDate: day(0) })
  await addTask({ title: 'Dentist', folderId: health.id, dueDate: day(1), dueTime: '10:30' })
  await addTask({ title: 'Book train tickets', dueDate: day(1) })

  const present = await addTask({
    title: 'Buy birthday present',
    folderId: home.id,
    dueDate: day(2),
  })
  for (const step of ['Pick a gift', 'Order it', 'Wrap it', 'Write a card']) {
    await addStep(present.id, step)
  }
  const [first, second] = (await db.tasks.get(present.id))!.steps
  await toggleStep(present.id, first!.id)
  await toggleStep(present.id, second!.id)

  await addTask({ title: 'Quarterly report', folderId: work.id, dueDate: day(3) })
  await addTask({ title: 'Renew passport', dueDate: day(10) })
  await addTask({ title: 'Plan holiday', folderId: work.id })

  for (const [title, folderId] of [
    ['Expenses', work.id],
    ['Post parcel', errands.id],
    ['Collect dry cleaning', errands.id],
  ] as const) {
    const t = await addTask({ title, folderId })
    await completeTask(t.id)
  }
}
