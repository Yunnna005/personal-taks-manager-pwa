// Decorative: callers show the same numbers as text ("2 of 4 done").
export default function ProgressBar({
  done,
  total,
  tall = false,
  onSurface = false,
  className = '',
}: {
  done: number
  total: number
  /** 12px for the folder header instead of 8px. */
  tall?: boolean
  /** On a white/dark card rather than a bright tile: follow the text colour so dark mode works. */
  onSurface?: boolean
  className?: string
}) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div
      aria-hidden="true"
      className={`${tall ? 'h-3' : 'h-2'} overflow-hidden rounded-full ${onSurface ? 'bg-text/16' : 'bg-ink/16'} ${className}`}
    >
      <div
        className={`h-full rounded-full ${onSurface ? 'bg-text' : 'bg-ink'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
