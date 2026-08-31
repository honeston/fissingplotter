import { ArrowLeft, FishSymbol, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'

interface PageHeaderProps {
  title: string
  backTo?: string
  backLabel?: string
  action?: ReactNode
  icon?: LucideIcon
}

export function PageHeader({
  title,
  backTo,
  backLabel = '戻る',
  action,
  icon = FishSymbol,
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon icon={icon} size="lg" className="mt-0.5 text-cyan-700" />
        <h1 className="text-xl font-semibold text-sky-950">{title}</h1>
      </div>
      {action ??
        (backTo ? (
          <Link
            to={backTo}
            aria-label={backLabel}
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-sky-200 bg-white text-cyan-800 shadow-sm"
          >
            <Icon icon={ArrowLeft} size="sm" />
          </Link>
        ) : null)}
    </header>
  )
}
