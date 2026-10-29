// Decorative: callers show the same numbers as text ("2 of 4 done").
export default function ProgressBar({
  done,
  total,
  className = '',
}: {
  done: number
  total: number
  className?: string
}) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div aria-hidden="true" className={`h-2 overflow-hidden rounded-full bg-ink/16 ${className}`}>
      <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
    </div>
  )
}
