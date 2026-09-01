import { Cloud, LogOut, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isPublicContentPath } from '../legal/meta'
import { Icon } from './ui/Icon'

export function SyncStatusBanner() {
  const { cloudEnabled, authenticated, userEmail, signOut } = useAuth()
  const { pathname } = useLocation()

  if (pathname === '/login' || isPublicContentPath(pathname) || !authenticated) {
    return null
  }

  const showLoginStatus = cloudEnabled

  return (
    <div className="border-b border-sky-100 bg-sky-50/80 px-4 py-2 text-xs text-sky-900">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <Link
            to="/mypage"
            data-testid="banner-mypage"
            className="inline-flex shrink-0 items-center gap-1 font-medium text-cyan-800"
          >
            <Icon icon={User} size="xs" />
            マイページ
          </Link>
          {showLoginStatus && (
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <Icon icon={Cloud} size="xs" className="shrink-0 text-cyan-700" />
              <span className="truncate" title={userEmail ?? undefined}>
                {userEmail ? `${userEmail} でログイン中` : 'ログイン中'}
              </span>
            </span>
          )}
        </span>
        {showLoginStatus && (
          <button
            type="button"
            onClick={signOut}
            aria-label="ログアウト"
            className="inline-flex shrink-0 items-center gap-1 font-medium text-cyan-800"
          >
            <Icon icon={LogOut} size="xs" />
            <span className="sr-only">ログアウト</span>
          </button>
        )}
      </div>
    </div>
  )
}
