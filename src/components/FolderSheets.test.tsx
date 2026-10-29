import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createFolder, getFolder, listFolders } from '../db/folders.ts'
import { db } from '../db/schema.ts'
import { nextColor } from './folderColors.ts'
import { DeleteFolderConfirm, FolderEditor } from './FolderSheets.tsx'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('nextColor', () => {
  it('picks the first unused colour, wrapping to lilac when all are taken', async () => {
    expect(nextColor([])).toBe('lilac')
    const a = await createFolder('A', 'lilac')
    const b = await createFolder('B', 'peach')
    expect(nextColor([a, b])).toBe('mint')
    const all = await Promise.all(
      (['mint', 'sky', 'butter', 'rose'] as const).map((c) => createFolder(c, c)),
    )
    expect(nextColor([a, b, ...all])).toBe('lilac')
  })
})

describe('FolderEditor', () => {
  it('creates a folder with the chosen name and colour', async () => {
    const onDone = vi.fn()
    render(<FolderEditor initialColor="mint" onDone={onDone} onCancel={() => {}} />)

    const create = screen.getByRole('button', { name: 'Create folder' })
    expect(create).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Mint' })).toBeChecked()

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Garden ' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Rose' }))
    fireEvent.click(create)

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(await listFolders()).toMatchObject([{ name: 'Garden', color: 'rose' }])
  })

  it('shows a live preview of the tile', () => {
    render(<FolderEditor initialColor="sky" onDone={() => {}} onCancel={() => {}} />)
    const preview = screen.getByText('Folder name').closest('[aria-hidden]')!
    expect(preview).toHaveClass('bg-sky')

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Work' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Peach' }))
    expect(preview).toHaveTextContent('Work')
    expect(preview).toHaveClass('bg-peach')
  })

  it('renames and recolours an existing folder', async () => {
    const folder = await createFolder('Wrok', 'sky')
    const onDone = vi.fn()
    render(<FolderEditor folder={folder} initialColor="sky" onDone={onDone} onCancel={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Edit folder' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Wrok')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Work' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Butter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(await getFolder(folder.id)).toMatchObject({ name: 'Work', color: 'butter' })
  })

  it('caps names at 40 characters and cancels without saving', () => {
    const onCancel = vi.fn()
    render(<FolderEditor initialColor="sky" onDone={() => {}} onCancel={onCancel} />)
    expect(screen.getByLabelText('Name')).toHaveAttribute('maxLength', '40')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

describe('DeleteFolderConfirm', () => {
  it.each([
    [0, 'It has no open tasks.'],
    [1, 'Its 1 open task will move to Unsorted.'],
    [3, 'Its 3 open tasks will move to Unsorted.'],
  ])('explains what happens to %i open tasks', async (n, text) => {
    const folder = await createFolder('Work', 'sky')
    render(
      <DeleteFolderConfirm folder={folder} openTasks={n} onDelete={() => {}} onKeep={() => {}} />,
    )
    expect(screen.getByRole('heading', { name: 'Delete Work?' })).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
  })
})
