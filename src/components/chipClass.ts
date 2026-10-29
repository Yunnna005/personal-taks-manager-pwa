const SELECTED = {
  ink: 'bg-ink text-white dark:bg-text-dark dark:text-ink',
  butter: 'bg-butter text-ink',
}

export type ChipTone = keyof typeof SELECTED

/** Chip classes, shared with chip-shaped controls that can't be a button (the date picker). */
export function chipClass({
  selected = false,
  tone = 'ink',
  dashed = false,
}: {
  selected?: boolean
  tone?: ChipTone
  dashed?: boolean
}) {
  const look = selected
    ? SELECTED[tone]
    : dashed
      ? 'border-2 border-dashed border-control text-text'
      : 'bg-bg text-text'
  return `inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-bold whitespace-nowrap ${look}`
}
