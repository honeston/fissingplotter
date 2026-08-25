import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type Step = 'email' | 'confirm'

const inputClassName =
  'w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60'

export function ChangeEmailPage() {
  const { cloudEnabled, userEmail, requestEmailChange, confirmEmailChange, refreshSession } =
    useAuth()
  const [step, setStep] = useState<Step>('email')
  const [newEmail, setNewEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (!cloudEnabled) {
    return <Navigate to="/mypage" replace />
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    const trimmed = newEmail.trim()
    if (trimmed === userEmail) {
      setError('現在と同じメールアドレスです')
      return
    }

    setBusy(true)
    try {
      await requestEmailChange(trimmed)
      setInfo(`${trimmed} 宛に確認コードを送信しました`)
      setStep('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メールアドレスの変更に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await confirmEmailChange(code.trim())
      await refreshSession()
      setInfo('メールアドレスを変更しました')
    } catch (err) {
      setError(err instanceof Error ? err.message : '確認コードの検証に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">cast mark</p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">メールアドレス変更</h1>
        </div>
        <Link
          to="/mypage"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          戻る
        </Link>
      </header>

      {userEmail && (
        <p className="mb-4 text-sm text-slate-500">
          現在のメールアドレス: <span className="font-medium text-sky-950">{userEmail}</span>
        </p>
      )}

      {step === 'email' ? (
        <form onSubmit={(e) => void handleEmailSubmit(e)} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-sky-900">
              新しいメールアドレス
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
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
            {busy ? '送信中…' : '確認コードを送信する'}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void handleConfirmSubmit(e)} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-sky-900">確認コード</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
            {busy ? '確認中…' : '変更を確定する'}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setStep('email')
              setCode('')
              setError('')
              setInfo('')
            }}
            className="text-sm text-cyan-800 underline disabled:opacity-60"
          >
            メールアドレス入力に戻る
          </button>
        </form>
      )}
    </main>
  )
}
