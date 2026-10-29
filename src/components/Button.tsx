import type { ButtonHTMLAttributes } from 'react'

// DESIGN.md buttons: primary cobalt, strong ink, secondary 1.5px ink outline,
// destructive coral fill with ink text.
const VARIANTS = {
  primary: 'bg-cobalt text-white',
  strong: 'bg-ink text-white dark:bg-text-dark dark:text-ink',
  secondary: 'border-[1.5px] border-ink text-ink dark:border-text-dark dark:text-text-dark',
  destructive: 'bg-late text-ink',
}

export default function Button({
  variant,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant: keyof typeof VARIANTS }) {
  return (
    <button
      type="button"
      className={`h-[52px] rounded-full px-5 text-[17px] font-bold disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
