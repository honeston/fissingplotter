import { BookOpen, Calendar, FishSymbol, User, type LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from './Icon'

function scrollWindowToTop() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

function isEncyclopediaPath(pathname: string) {
  return pathname === '/mypage/encyclopedia' || pathname.startsWith('/mypage/encyclopedia/')
}

function isMyPagePath(pathname: string) {
  return (pathname === '/mypage' || pathname.startsWith('/mypage/')) && !isEncyclopediaPath(pathname)
}

const NAV_ITEMS: {
  to: string
  label: string
  shortLabel: string
  icon: LucideIcon
  testId: string
  isActive: (pathname: string) => boolean
}[] = [
  {
    to: '/',
    label: '記録',
    shortLabel: '記録',
    icon: FishSymbol,
    testId: 'nav-record',
    isActive: (pathname) => pathname === '/',
  },
  {
    to: '/history',
    label: '履歴',
    shortLabel: '履歴',
    icon: Calendar,
    testId: 'nav-history',
    isActive: (pathname) => pathname === '/history' || pathname.startsWith('/history/'),
  },
  {
    to: '/mypage/encyclopedia',
    label: 'マイ図鑑',
    shortLabel: '図鑑',
    icon: BookOpen,
    testId: 'nav-encyclopedia',
    isActive: isEncyclopediaPath,
  },
  {
    to: '/mypage',
    label: 'マイページ',
    shortLabel: 'マイ',
    icon: User,
    testId: 'nav-mypage',
    isActive: isMyPagePath,
  },
]

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="sticky bottom-0 border-t border-sky-100 bg-white/90 backdrop-blur"
      aria-label="メインナビゲーション"
    >
      <div className="mx-auto flex max-w-md">
        {NAV_ITEMS.map(({ to, label, shortLabel, icon, testId, isActive }) => {
          const active = isActive(pathname)
          return (
            <Link
              key={to}
              to={to}
              onClick={scrollWindowToTop}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              data-testid={testId}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                active ? 'text-cyan-800' : 'text-slate-400'
              }`}
            >
              <Icon icon={icon} size="md" className={active ? 'text-cyan-800' : 'text-slate-400'} />
              <span>{shortLabel}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
