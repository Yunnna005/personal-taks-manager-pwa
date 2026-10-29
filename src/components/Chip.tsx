import type { ButtonHTMLAttributes } from 'react'

const SELECTED = {
  ink: 'bg-ink text-white dark:bg-text-dark dark:text-ink',
  butter: 'bg-butter text-ink',
}

/** Round toggle chip. 44px tall (DESIGN.md says 40) to meet the touch target rule. */
export default function Chip({
  selected = false,
  tone = 'ink',
  dashed = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean
  tone?: keyof typeof SELECTED
  dashed?: boolean
}) {
  const look = selected
    ? SELECTED[tone]
    : dashed
      ? 'border-2 border-dashed border-control text-text'
      : 'bg-bg text-text'
  return (
    <button
      type="button"
      aria-pressed={dashed ? undefined : selected}
      className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-bold whitespace-nowrap ${look} ${className}`}
      {...props}
    />
  )
}
