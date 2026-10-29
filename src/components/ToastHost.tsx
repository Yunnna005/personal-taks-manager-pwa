import { pauseToast, resumeToast, undoToast, useToast } from '../lib/toast.ts'

/**
 * The single toast, above the add bar on every screen. The live region stays
 * in the page so screen readers announce each new message.
 */
export default function ToastHost() {
  const toast = useToast()

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(max(12px,env(safe-area-inset-bottom))+74px)] z-10 px-5"
    >
      {toast && (
        <div
          key={toast.id}
          onPointerEnter={pauseToast}
          onPointerLeave={resumeToast}
          onFocus={pauseToast}
          onBlur={resumeToast}
          className="toast pointer-events-auto mx-auto flex min-h-14 max-w-xl items-center gap-3 rounded-full bg-ink py-1.5 pr-1.5 pl-5 text-white dark:bg-card-raised"
        >
          <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={undoToast}
              className="h-11 shrink-0 rounded-full bg-butter px-5 text-[15px] font-bold text-ink"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
