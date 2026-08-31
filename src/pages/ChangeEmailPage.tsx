import { KeyRound, Mail } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { IconButton } from '../components/ui/IconButton'
import { PageHeader } from '../components/ui/PageHeader'
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
      <PageHeader title="メール変更" icon={Mail} backTo="/mypage" backLabel="戻る" />

      {userEmail && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
          <Icon icon={Mail} size="sm" className="text-slate-400" />
          <span className="truncate font-medium text-sky-950">{userEmail}</span>
        </p>
      )}

      {step === 'email' ? (
        <form onSubmit={(e) => void handleEmailSubmit(e)} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-sky-900">
              <Icon icon={Mail} size="sm" className="text-cyan-700" />
              新メール
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

          <IconButton type="submit" icon={Mail} label="確認コードを送信する" disabled={busy} fullWidth>
            {busy ? '送信中…' : 'コード送信'}
          </IconButton>
        </form>
      ) : (
        <form onSubmit={(e) => void handleConfirmSubmit(e)} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-sky-900">
              <Icon icon={KeyRound} size="sm" className="text-cyan-700" />
              確認コード
            </span>
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

          <IconButton type="submit" icon={Mail} label="変更を確定する" disabled={busy} fullWidth>
            {busy ? '確認中…' : '確定'}
          </IconButton>

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
