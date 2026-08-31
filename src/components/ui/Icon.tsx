import type { LucideIcon } from 'lucide-react'

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASS: Record<IconSize, string> = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-8',
}

interface IconProps {
  icon: LucideIcon
  size?: IconSize
  className?: string
  label?: string
}

export function Icon({ icon: LucideComponent, size = 'md', className = '', label }: IconProps) {
  return (
    <LucideComponent
      className={`shrink-0 ${SIZE_CLASS[size]} ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  )
}
