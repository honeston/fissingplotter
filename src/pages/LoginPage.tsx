import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { LegalLinks } from '../components/LegalLinks'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'login' | 'signup' | 'confirm'

function modeFromSearch(params: URLSearchParams): Mode {
  return params.get('mode') === 'signup' ? 'signup' : 'login'
}

export function LoginPage() {
  const { signIn, signUp, confirmSignUp, authenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>(() => modeFromSearch(searchParams))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [agreed, setAgreed] = useState(false)

  if (authenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (mode === 'signup' && !agreed) {
      setError('利用規約とプライバシーポリシーへの同意が必要です')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else if (mode === 'signup') {
        await signUp(email.trim(), password)
        setInfo('確認コードをメールで送信しました')
        setMode('confirm')
      } else {
        await confirmSignUp(email.trim(), code.trim())
        setInfo('登録が完了しました。ログインしてください')
        setMode('login')
        setSearchParams({}, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  const formTitle =
    mode === 'login' ? 'ログイン' : mode === 'signup' ? '新規登録' : '確認コード'

  function switchMode(next: 'login' | 'signup') {
    setMode(next)
    setAgreed(false)
    setError('')
    setInfo('')
    setSearchParams(next === 'signup' ? { mode: 'signup' } : {}, { replace: true })
  }

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">cast mark</p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">{formTitle}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === 'confirm'
              ? 'メールに届いた確認コードを入力してください。'
              : mode === 'signup'
                ? 'メールアドレスでアカウントを作成します。記録時は位置情報を使います。'
                : 'クラウド同期にはアカウントが必要です。記録時は位置情報を使います。'}
          </p>
        </div>
        <Link
          to="/"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          戻る
        </Link>
      </header>

      <section>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-sky-900">メールアドレス</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={mode === 'confirm' || busy}
              className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
            />
          </label>

          {mode !== 'confirm' && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-sky-900">パスワード</span>
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
              />
            </label>
          )}

          {mode === 'confirm' && (
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
                className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
              />
            </label>
          )}

          {mode === 'signup' && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-200 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={busy}
                required
                className="mt-1 size-4 shrink-0 accent-cyan-700"
              />
              <span className="text-sm text-sky-950">
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="underline decoration-slate-300 underline-offset-2 hover:text-cyan-800"
                >
                  利用規約
                </Link>
                および
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="underline decoration-slate-300 underline-offset-2 hover:text-cyan-800"
                >
                  プライバシーポリシー
                </Link>
                に同意します
              </span>
            </label>
          )}

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
            disabled={busy || (mode === 'signup' && !agreed)}
            className="min-h-12 rounded-xl bg-cyan-700 px-4 py-3 text-base font-semibold text-white shadow-md disabled:opacity-60"
          >
            {busy
              ? '処理中…'
              : mode === 'login'
                ? 'ログイン'
                : mode === 'signup'
                  ? '登録する'
                  : '確認する'}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-cyan-800">
          {mode === 'login' && (
            <>
              <p>
                <Link to="/forgot-password" state={{ email: email.trim() }} className="underline">
                  パスワードを忘れた
                </Link>
              </p>
              <p>
                <button type="button" onClick={() => switchMode('signup')} className="underline">
                  アカウントを作成
                </button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => switchMode('login')} className="underline">
              ログインに戻る
            </button>
          )}
          {mode === 'confirm' && (
            <button type="button" onClick={() => switchMode('login')} className="underline">
              ログインに戻る
            </button>
          )}
        </div>
        <LegalLinks className="mt-6" newTab />
      </section>
    </main>
  )
}
