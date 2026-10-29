import { PlusIcon } from './icons.tsx'

/** Fixed to the bottom of every screen. Opens the quick add sheet. */
export default function AddBar({
  label,
  onOpen,
  plusClassName = 'bg-addbar-plus text-addbar-plus-icon',
}: {
  label: string
  onOpen?: () => void
  /** Inside a folder the plus button takes the folder colour. */
  plusClassName?: string
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 px-5 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto max-w-xl">
        <button
          type="button"
          onClick={onOpen}
          className="flex h-[62px] w-full items-center rounded-full bg-addbar pr-2 pl-6 text-left"
        >
          <span className="flex-1 text-[17px] text-addbar-text">{label}</span>
          <span
            aria-hidden="true"
            className={`grid size-[46px] place-items-center rounded-full ${plusClassName}`}
          >
            <PlusIcon className="size-6" />
          </span>
        </button>
      </div>
    </div>
  )
}
