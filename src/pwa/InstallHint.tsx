import { CloseIcon } from '../components/icons.tsx'

/**
 * Shown once in Safari on iPhone before installing. Safari tabs and the
 * installed app keep separate data, so tasks added here won't move across.
 */
export default function InstallHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section
      aria-labelledby="install-hint-title"
      className="relative mt-6 rounded-card bg-sky p-4 pr-14 text-ink"
    >
      <h2 id="install-hint-title" className="text-[17px] font-bold">
        Install soon on this iPhone
      </h2>
      <p className="mt-1 text-[15px]">
        Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>, and open soon from
        there.
      </p>
      <p className="mt-2 text-[15px]">
        Install before adding tasks: tasks added in a Safari tab stay in Safari and don't move to
        the installed app.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Got it, hide install tip"
        className="absolute top-2 right-2 grid size-11 place-items-center rounded-full"
      >
        <CloseIcon className="size-5" />
      </button>
    </section>
  )
}
