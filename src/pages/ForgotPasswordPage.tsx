import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { LegalLinks } from '../components/LegalLinks'
import { useAuth } from '../contexts/AuthContext'
import { forgotPasswordErrorMessage } from '../lib/auth'

type Step = 'email' | 'confirm'

const inputClassName =
  'w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60'

function emailFromLocationState(state: unknown): string {
  if (state && typeof state === 'object' && 'email' in state && typeof state.email === 'string') {
    return state.email
  }
  return ''
}

export function ForgotPasswordPage() {
  const { authenticated, forgotPassword, confirmForgotPassword, signIn } = useAuth()
  const location = useLocation()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(() => emailFromLocationState(location.state))
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (authenticated) {
    return <Navigate to="/" replace />
  }

  async function sendCode(targetEmail: string) {
    await forgotPassword(targetEmail)
    setInfo('登録されている場合、確認コードをメールで送信しました')
    setStep('confirm')
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    const trimmed = email.trim()
    setBusy(true)
    try {
      await sendCode(trimmed)
    } catch (err) {
      setError(forgotPasswordErrorMessage(err, '確認コードの送信に失敗しました'))
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmSubmit(e: React.FormEvent) {
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

    const trimmedEmail = email.trim()
    setBusy(true)
    try {
      await confirmForgotPassword(trimmedEmail, code.trim(), newPassword)
      await signIn(trimmedEmail, newPassword)
    } catch (err) {
      setError(forgotPasswordErrorMessage(err, 'パスワードの再設定に失敗しました'))
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    setError('')
    setBusy(true)
    try {
      await forgotPassword(email.trim())
      setInfo('確認コードを再送信しました')
    } catch (err) {
      setError(forgotPasswordErrorMessage(err, '確認コードの再送信に失敗しました'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">cast mark</p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">パスワード再設定</h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === 'email'
              ? '登録したメールアドレスに確認コードを送ります。'
              : 'メールに届いた確認コードと、新しいパスワードを入力してください。'}
          </p>
        </div>
        <Link
          to="/login"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          戻る
        </Link>
      </header>

      {step === 'email' ? (
        <form onSubmit={(e) => void handleEmailSubmit(e)} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-sky-900">メールアドレス</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <p className="text-sm text-slate-500">
            送信先: <span className="font-medium text-sky-950">{email.trim()}</span>
          </p>

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
            <span className="mt-1 block text-xs text-slate-500">
              8文字以上。英小文字と数字を含めてください。
            </span>
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
            {busy ? '再設定中…' : 'パスワードを再設定する'}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleResend()}
            className="text-sm text-cyan-800 underline disabled:opacity-60"
          >
            確認コードを再送信
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setStep('email')
              setCode('')
              setNewPassword('')
              setConfirmPassword('')
              setError('')
              setInfo('')
            }}
            className="text-sm text-cyan-800 underline disabled:opacity-60"
          >
            メールアドレス入力に戻る
          </button>
        </form>
      )}

      <div className="mt-6 text-sm text-cyan-800">
        <Link to="/login" className="underline">
          ログインに戻る
        </Link>
      </div>
      <LegalLinks className="mt-6" newTab />
    </main>
  )
}
