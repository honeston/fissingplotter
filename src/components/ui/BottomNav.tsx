import { BookOpen, Calendar, FishSymbol } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'

function scrollWindowToTop() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

const NAV_ITEMS = [
  { to: '/', end: true, label: '記録', shortLabel: '記録', icon: FishSymbol, testId: 'nav-record' },
  { to: '/history', end: false, label: '履歴', shortLabel: '履歴', icon: Calendar, testId: 'nav-history' },
  {
    to: '/mypage/encyclopedia',
    end: false,
    label: 'マイ図鑑',
    shortLabel: '図鑑',
    icon: BookOpen,
    testId: 'nav-encyclopedia',
  },
] as const

export function BottomNav() {
  return (
    <nav
      className="sticky bottom-0 border-t border-sky-100 bg-white/90 backdrop-blur"
      aria-label="メインナビゲーション"
    >
      <div className="mx-auto flex max-w-md">
        {NAV_ITEMS.map(({ to, end, label, shortLabel, icon, testId }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={scrollWindowToTop}
            aria-label={label}
            data-testid={testId}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                isActive ? 'text-cyan-800' : 'text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon icon={icon} size="md" className={isActive ? 'text-cyan-800' : 'text-slate-400'} />
                <span>{shortLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
