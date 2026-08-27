import { Link } from 'react-router-dom'
import {
  EncyclopediaScreenMock,
  HistoryScreenMock,
  RecordScreenMock,
} from '../components/AppScreenMocks'
import { LegalLinks } from '../components/LegalLinks'
import { SERVICE_NAME } from '../legal/meta'

const SIGNUP_HREF = '/login?mode=signup'

function SignupButton({ children }: { children: string }) {
  return (
    <Link
      to={SIGNUP_HREF}
      className="flex min-h-12 items-center justify-center rounded-xl bg-cyan-700 px-4 py-3 text-base font-semibold text-white shadow-md"
    >
      {children}
    </Link>
  )
}

export function LandingPage() {
  return (
    <>
      <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
        <header className="mb-8 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium tracking-wide text-cyan-700">{SERVICE_NAME}</p>
            <h1 className="mt-1 text-2xl font-semibold text-sky-950">
              釣れた瞬間の条件を、そのまま残す
            </h1>
          </div>
          <Link
            to="/login"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
          >
            ログイン
          </Link>
        </header>

        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          気温・天気・潮位・現在地をワンタップで記録する、釣り専用のログアプリです。ノートや地図アプリを行き来せず、その場の条件と釣果を一つの記録にまとめます。
        </p>

        <SignupButton>無料ではじめる</SignupButton>
        <p className="mt-2 text-center text-sm text-slate-500">
          アカウント作成は無料です。メールアドレスだけで始められます。
        </p>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-sky-950">できること</h2>
          <ul className="space-y-3">
            <li className="rounded-xl border border-sky-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-sm font-medium text-sky-950">ワンタップ記録</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                「記録する」を押すと、GPS・気温・天気・潮位を自動で保存します。魚種・サイズ・写真・タックルは任意。何も書かずにボタンだけでも残せます。
              </p>
            </li>
            <li className="rounded-xl border border-sky-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-sm font-medium text-sky-950">履歴と地図</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                いつ・どこで釣れたかを、カレンダーと地図で振り返れます。記録の編集や削除もあとからできます。
              </p>
            </li>
            <li className="rounded-xl border border-sky-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-sm font-medium text-sky-950">マイ魚種図鑑</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                釣った魚種ごとの尾数や最大サイズを、記録から自動で集計します。
              </p>
            </li>
            <li className="rounded-xl border border-sky-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-sm font-medium text-sky-950">マイタックル</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                ロッド・リール・ルアーなどをセットとして保存し、記録時に呼び出せます。
              </p>
            </li>
            <li className="rounded-xl border border-sky-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-sm font-medium text-sky-950">オフラインでも残る</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                記録は端末にも保存されます。通信できないときも残り、復帰後にクラウドへ同期します。
              </p>
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="mb-2 text-lg font-semibold text-sky-950">釣れたら、押すだけ</h2>
          <p className="mb-2 text-sm leading-relaxed text-slate-600">
            入力はすべて任意です。釣れた直後に記録し、魚種やサイズは帰宅後に足せます。
          </p>
          <RecordScreenMock />
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold text-sky-950">あとから、地図で振り返る</h2>
          <p className="mb-2 text-sm leading-relaxed text-slate-600">
            カレンダーで期間を絞り、地図のピンからその場所の記録を開けます。
          </p>
          <HistoryScreenMock />
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold text-sky-950">釣果が、図鑑になる</h2>
          <p className="mb-2 text-sm leading-relaxed text-slate-600">
            魚種ごとの尾数と最大サイズが自動で並びます。自分だけの釣果アルバムです。
          </p>
          <EncyclopediaScreenMock />
        </section>

        <section className="mt-10 rounded-xl border border-sky-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-sm font-medium text-sky-950">記録は、あなただけのもの</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            公開の釣り場データベースではありません。残した座標や写真はアカウントに紐づき、本人以外は見られません。
          </p>
        </section>

        <section className="mt-8 rounded-xl border border-sky-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-sm font-medium text-sky-950">使ってみる</p>
          <p className="mt-1 text-sm text-slate-500">
            アカウントを作ると、記録・同期・履歴の振り返りが使えます。現時点では無料です。
          </p>
          <p className="mt-3 text-sm">
            <Link to="/guide" className="font-medium text-cyan-800 underline underline-offset-2">
              使い方を見る
            </Link>
          </p>
        </section>

        <div className="mt-8 border-t border-sky-100 pt-4">
          <LegalLinks />
        </div>
      </main>
      <div className="sticky bottom-0 border-t border-sky-100 bg-white/90 backdrop-blur">
        <div className="px-4 py-3">
          <SignupButton>無料ではじめる</SignupButton>
          <p className="mt-2 text-center text-sm">
            <Link to="/login" className="font-medium text-cyan-800 underline underline-offset-2">
              ログインはこちら
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
