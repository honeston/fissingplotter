import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon, type IconSize } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    'bg-cyan-700 text-white shadow-md enabled:hover:bg-cyan-800 enabled:active:scale-[0.98]',
  secondary:
    'border border-sky-200 bg-white text-cyan-800 shadow-sm enabled:hover:bg-sky-50 enabled:active:scale-[0.98]',
  ghost: 'text-cyan-800 enabled:hover:bg-sky-50',
  danger: 'border border-red-200 bg-red-50/50 text-red-800 enabled:hover:bg-red-100',
}

interface IconButtonProps {
  icon?: LucideIcon
  label: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  variant?: Variant
  fullWidth?: boolean
  testId?: string
  children?: ReactNode
  className?: string
  iconSize?: IconSize
}

export function IconButton({
  icon,
  label,
  onClick,
  type = 'button',
  disabled,
  variant = 'primary',
  fullWidth,
  testId,
  children,
  className = '',
  iconSize = 'sm',
}: IconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-testid={testId}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${VARIANT_CLASS[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {icon && <Icon icon={icon} size={iconSize} />}
      <span>{children ?? label}</span>
    </button>
  )
}
