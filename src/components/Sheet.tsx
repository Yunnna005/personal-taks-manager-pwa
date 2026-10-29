import { useLayoutEffect, useRef, type ReactNode } from 'react'

/**
 * Bottom sheet on a native modal <dialog>: focus stays inside, Escape and a
 * tap on the dimmed background close it. Children mount only while open, so
 * each opening starts fresh. Mark the element to focus with data-autofocus.
 *
 * To get the keyboard up on iOS, open it from a tap handler with flushSync so
 * showModal (and the autofocus) happens inside the tap.
 */
export default function Sheet({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // React's autoFocus fires while the dialog is still closed, so focus here instead
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        // The dialog element itself is only hit outside the panel, on the backdrop
        if (e.target === e.currentTarget) onClose()
      }}
      className="sheet inset-x-0 top-auto bottom-0 mx-auto mb-0 max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-sheet bg-surface p-0 text-text"
    >
      <div className="px-5 pt-2.5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-control/50" />
        {open && children}
      </div>
    </dialog>
  )
}
