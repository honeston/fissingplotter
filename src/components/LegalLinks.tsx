import { Link } from 'react-router-dom'

const linkClassName =
  'underline decoration-slate-300 underline-offset-2 hover:text-cyan-800'

export function LegalLinks({
  className = '',
  newTab = false,
}: {
  className?: string
  newTab?: boolean
}) {
  const extra = newTab ? { target: '_blank' as const, rel: 'noopener noreferrer' } : {}

  return (
    <nav className={`flex flex-wrap items-center gap-y-1 text-sm text-slate-500 ${className}`.trim()}>
      <Link to="/guide" {...extra} className={linkClassName}>
        使い方
      </Link>
      <span className="mx-2 text-slate-300" aria-hidden>
        |
      </span>
      <Link to="/privacy" {...extra} className={linkClassName}>
        プライバシーポリシー
      </Link>
      <span className="mx-2 text-slate-300" aria-hidden>
        |
      </span>
      <Link to="/terms" {...extra} className={linkClassName}>
        利用規約
      </Link>
    </nav>
  )
}
