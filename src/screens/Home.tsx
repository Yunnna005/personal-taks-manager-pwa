// Placeholder for milestone 0. Real Home arrives in milestone 2.
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export default function Home({ now = new Date() }: { now?: Date }) {
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pt-6 pb-10">
      <header className="flex h-11 items-center">
        <p className="text-section">soon</p>
      </header>
      <h1 className="mt-6 text-display">{dateFormat.format(now).replace(',', '')}</h1>
    </main>
  )
}
