import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const inputClassName =
  'w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60'

export function ChangePasswordPage() {
  const { cloudEnabled, changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (!cloudEnabled) {
    return <Navigate to="/mypage" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません')
      return
    }
    if (newPassword.length < 8) {
      setError('新しいパスワードは8文字以上にしてください')
      return
    }

    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setInfo('パスワードを変更しました')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'パスワードの変更に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">Fissing Plotter</p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">パスワード変更</h1>
        </div>
        <Link
          to="/mypage"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          戻る
        </Link>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-sky-900">現在のパスワード</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={busy}
            className={inputClassName}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-sky-900">新しいパスワード</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={busy}
            className={inputClassName}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-sky-900">
            新しいパスワード（確認）
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={busy}
            className={inputClassName}
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-lg bg-cyan-50 px-3 py-2 text-sm text-cyan-900" role="status">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-xl bg-cyan-700 px-4 py-3 text-base font-semibold text-white shadow-md disabled:opacity-60"
        >
          {busy ? '変更中…' : 'パスワードを変更する'}
        </button>
      </form>
    </main>
  )
}
