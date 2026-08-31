import type { LucideIcon } from 'lucide-react'
import { Icon } from './Icon'

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  testId?: string
}

export function EmptyState({ icon, message, testId }: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-10 text-center"
    >
      <Icon icon={icon} size="xl" className="mx-auto text-slate-300" />
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  )
}
