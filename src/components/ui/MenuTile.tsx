import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'

interface MenuTileProps {
  to: string
  icon: LucideIcon
  title: string
  testId?: string
}

export function MenuTile({ to, icon, title, testId }: MenuTileProps) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className="flex items-center gap-3 rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm transition hover:border-sky-300 active:bg-sky-50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50">
        <Icon icon={icon} size="md" className="text-cyan-700" />
      </span>
      <span className="min-w-0 flex-1 font-medium text-sky-950">{title}</span>
      <Icon icon={ChevronRight} size="sm" className="text-cyan-700" />
    </Link>
  )
}
