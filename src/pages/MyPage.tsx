import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface FutureMenuItemProps {
  title: string
  description: string
}

function FutureMenuItem({ title, description }: FutureMenuItemProps) {
  return (
    <div
      className="flex items-start justify-between gap-3 rounded-xl border border-sky-200 bg-white/70 px-4 py-3 shadow-sm"
      aria-disabled="true"
    >
      <div className="min-w-0">
        <p className="font-medium text-sky-950">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
        準備中
      </span>
    </div>
  )
}

export function MyPage() {
  const { cloudEnabled, userEmail } = useAuth()

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-6">
        <p className="text-sm font-medium tracking-wide text-cyan-700">Fissing Plotter</p>
        <h1 className="mt-1 text-2xl font-semibold text-sky-950">マイページ</h1>
      </header>

      <section className="mb-6 rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-sm font-medium text-sky-900">アカウント</h2>
        {cloudEnabled ? (
          <>
            <p className="mt-2 text-sm text-sky-950">
              {userEmail ? (
                <>
                  <span className="block truncate font-medium">{userEmail}</span>
                  <span className="mt-1 block text-slate-500">クラウド同期が有効です</span>
                </>
              ) : (
                <span className="text-slate-500">ログイン情報を確認中…</span>
              )}
            </p>
            <div className="mt-3 flex flex-col gap-2 border-t border-sky-100 pt-3">
              <Link
                to="/mypage/email"
                className="rounded-lg border border-sky-200 bg-sky-50/50 px-3 py-2 text-sm font-medium text-cyan-800"
              >
                メールアドレスを変更
              </Link>
              <Link
                to="/mypage/password"
                className="rounded-lg border border-sky-200 bg-sky-50/50 px-3 py-2 text-sm font-medium text-cyan-800"
              >
                パスワードを変更
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            この端末に記録を保存しています。クラウド同期は未設定です。
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-sky-900">マイデータ</h2>
        <div className="flex flex-col gap-3">
          <FutureMenuItem
            title="マイタックル"
            description="ロッド・リール・ルアーなど、愛用のタックルを管理します。"
          />
          <Link
            to="/mypage/encyclopedia"
            className="flex items-start justify-between gap-3 rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm transition hover:border-sky-300 active:bg-sky-50"
          >
            <div className="min-w-0">
              <p className="font-medium text-sky-950">マイ魚種図鑑</p>
              <p className="mt-1 text-sm text-slate-500">
                釣った魚を図鑑形式で記録・閲覧します。
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-cyan-800">開く</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
