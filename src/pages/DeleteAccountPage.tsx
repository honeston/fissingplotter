import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { deleteAccount } from '../lib/api'
import { clearLocalUserData } from '../lib/storage'

export function DeleteAccountPage() {
  const { cloudEnabled, authenticated, signOut } = useAuth()
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!cloudEnabled) {
    return <Navigate to="/mypage" replace />
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!confirmed) {
      setError('内容を確認のうえ、チェックを入れてください')
      return
    }

    setBusy(true)
    try {
      await deleteAccount()
      await clearLocalUserData()
      signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '退会処理に失敗しました')
      setBusy(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">cast mark</p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">退会</h1>
        </div>
        <Link
          to="/mypage"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          戻る
        </Link>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-sky-950">
          <p className="font-medium text-red-800">この操作は取り消せません</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
            <li>アカウントにすぐログインできなくなります</li>
            <li>クラウド上の釣り記録・写真は退会後 7 日以内に削除されます</li>
            <li>この端末に保存された記録・写真・タックルも削除されます</li>
          </ul>
          <p className="mt-3 text-slate-600">
            データの取扱いの詳細は
            <Link
              to="/privacy"
              className="underline decoration-slate-300 underline-offset-2 hover:text-cyan-800"
            >
              プライバシーポリシー
            </Link>
            をご覧ください。
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={busy}
            className="mt-1 size-4 shrink-0 accent-red-700"
          />
          <span className="text-sm text-sky-950">
            上記の内容を理解し、アカウントを削除することに同意します
          </span>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !confirmed}
          className="min-h-12 rounded-xl bg-red-700 px-4 py-3 text-base font-semibold text-white shadow-md disabled:opacity-60"
        >
          {busy ? '退会処理中…' : '退会する'}
        </button>
      </form>
    </main>
  )
}
