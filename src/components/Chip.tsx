import type { ButtonHTMLAttributes } from 'react'
import { chipClass, type ChipTone } from './chipClass.ts'

/** Round toggle chip. 44px tall (DESIGN.md says 40) to meet the touch target rule. */
export default function Chip({
  selected = false,
  tone = 'ink',
  dashed = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean
  tone?: ChipTone
  dashed?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={dashed ? undefined : selected}
      className={`${chipClass({ selected, tone, dashed })} ${className}`}
      {...props}
    />
  )
}
