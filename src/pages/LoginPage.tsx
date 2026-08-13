import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'login' | 'signup' | 'confirm'

export function LoginPage() {
  const { signIn, signUp, confirmSignUp, cloudEnabled, authenticated, loading } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (!cloudEnabled) {
    return <Navigate to="/" replace />
  }

  if (!loading && authenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-8">
        <p className="text-sm font-medium tracking-wide text-cyan-700">Fissing Plotter</p>
        <h1 className="mt-1 text-2xl font-semibold text-sky-950">
          {mode === 'login' ? 'ログイン' : mode === 'signup' ? '新規登録' : '確認コード'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          クラウド同期にはアカウントが必要です。記録は端末にも保存されます。
        </p>
      </header>

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
          <button type="button" onClick={() => setMode('signup')} className="underline">
            アカウントを作成
          </button>
        )}
        {mode === 'signup' && (
          <button type="button" onClick={() => setMode('login')} className="underline">
            ログインに戻る
          </button>
        )}
        {mode === 'confirm' && (
          <button type="button" onClick={() => setMode('login')} className="underline">
            ログインに戻る
          </button>
        )}
      </div>
    </main>
  )
}
