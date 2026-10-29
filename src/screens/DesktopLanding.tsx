import QrCode from '../components/QrCode.tsx'

const updatedOn = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const IPHONE_STEPS = [
  'Open this page in Safari.',
  'Tap Share.',
  'Tap Add to Home Screen.',
  'Keep “Open as Web App” on.',
  'Tap Add.',
]

const ANDROID_STEPS = [
  'Open this page in Chrome.',
  'Tap the Install banner, or the ⋮ menu then Install app.',
  'Confirm.',
]

const NOTES = [
  ['Works offline', 'Once installed, soon opens without a connection.'],
  ['Private by default', 'Your tasks stay on your phone. No account, no tracking.'],
  ['Keep a backup', 'Export a file from Settings now and then.'],
]

/** Shown on desktop browsers: soon is made for phones, so point people there. */
export default function DesktopLanding({ onTry }: { onTry: () => void }) {
  const url = `${location.origin}/`

  return (
    <main className="mx-auto max-w-5xl px-8 py-12">
      <p className="inline-flex rounded-full bg-surface px-3 py-1 text-[14px] font-bold text-text-secondary">
        Version {__APP_VERSION__}
      </p>

      <div className="mt-8 grid items-start gap-10 md:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="text-display">soon lives on your phone</h1>
          <p className="mt-5 max-w-md text-[17px] text-text-secondary">
            A bold little task manager for things that are due soon. Scan the code with your phone
            to open it, then add it to your home screen.
          </p>
          <div className="mt-8 inline-block rounded-card bg-white p-4">
            <QrCode text={url} className="size-48" />
          </div>
          <p className="mt-3 text-[15px] font-semibold text-text-secondary">{url}</p>
        </div>

        <div className="flex flex-col gap-3">
          <section aria-labelledby="iphone-steps" className="rounded-card bg-lilac p-6 text-ink">
            <h2 id="iphone-steps" className="text-section">
              iPhone
            </h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[16px]">
              {IPHONE_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="android-steps" className="rounded-card bg-mint p-6 text-ink">
            <h2 id="android-steps" className="text-section">
              Android
            </h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[16px]">
              {ANDROID_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <ul className="mt-10 grid gap-3 md:grid-cols-3">
        {NOTES.map(([title, text]) => (
          <li key={title} className="rounded-card bg-surface p-5">
            <p className="text-[17px] font-bold">{title}</p>
            <p className="mt-1 text-[15px] text-text-secondary">{text}</p>
          </li>
        ))}
      </ul>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-divider pt-6 text-[14px] text-text-secondary">
        <p>
          Version {__APP_VERSION__} · Updated {updatedOn.format(new Date(__BUILD_DATE__))}
        </p>
        <button
          type="button"
          onClick={onTry}
          className="h-11 rounded-full px-4 text-[16px] font-bold text-link underline underline-offset-4"
        >
          Try it in this browser
        </button>
      </footer>
    </main>
  )
}
