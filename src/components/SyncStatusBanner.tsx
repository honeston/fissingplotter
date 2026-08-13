import { useAuth } from '../contexts/AuthContext'

export function SyncStatusBanner() {
  const { cloudEnabled, authenticated, syncMessage, signOut } = useAuth()

  if (!cloudEnabled || !authenticated) return null

  return (
    <div className="border-b border-sky-100 bg-sky-50/80 px-4 py-2 text-xs text-sky-900">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2">
        <span>
          {syncMessage || (cloudEnabled ? 'クラウド同期が有効です' : 'ログイン中')}
        </span>
        <button type="button" onClick={signOut} className="shrink-0 font-medium text-cyan-800 underline">
          ログアウト
        </button>
      </div>
    </div>
  )
}
