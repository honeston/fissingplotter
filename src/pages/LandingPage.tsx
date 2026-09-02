import {
  BookOpen,
  Calendar,
  CloudOff,
  FishSymbol,
  Lock,
  Map,
  PlayCircle,
  Shield,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  EncyclopediaScreenMock,
  HistoryScreenMock,
  RecordScreenMock,
} from '../components/AppScreenMocks'
import { LegalLinks } from '../components/LegalLinks'
import { FishingRod } from '../components/icons/FishingRod'
import { Icon } from '../components/ui/Icon'
import { SERVICE_NAME, SERVICE_TAGLINE } from '../legal/meta'

const SIGNUP_HREF = '/login?mode=signup'

const FEATURES = [
  { icon: FishSymbol, title: 'ワンタップ', desc: 'GPS・天気・潮位を自動保存' },
  { icon: Map, title: '履歴', desc: 'カレンダーと地図で自分の釣果を振り返り' },
  { icon: BookOpen, title: '図鑑', desc: '魚種ごとに尾数・最大サイズ' },
  { icon: FishingRod, title: 'タックル', desc: 'セット保存して記録時に呼び出し' },
  { icon: CloudOff, title: 'オフライン', desc: '端末保存、復帰後に同期' },
] as const

export function LandingPage() {
  return (
    <>
      <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Icon icon={FishSymbol} size="xl" className="text-cyan-700" />
            <h1 className="text-2xl font-semibold text-sky-950">{SERVICE_NAME}</h1>
          </div>
          <Link
            to="/login"
            aria-label="ログイン"
            className="flex min-h-10 items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
          >
            <Icon icon={Lock} size="sm" />
            ログイン
          </Link>
        </header>

        <h2 className="text-lg font-semibold leading-snug text-sky-950">{SERVICE_TAGLINE}</h2>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-slate-600">
          投稿もフォローもありません。ワンタップで位置・天気・潮位を残し、地図と図鑑は自分だけが見られます。気負わず、自分のペースで始められます。
        </p>

        <Link
          to={SIGNUP_HREF}
          aria-label="無料ではじめる"
          data-testid="signup-cta"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-base font-semibold text-white shadow-md"
        >
          <Icon icon={PlayCircle} size="sm" />
          はじめる
        </Link>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-sky-950">できること</h2>
          <ul className="grid gap-3">
            {FEATURES.map(({ icon, title, desc }) => (
              <li
                key={title}
                className="flex items-center gap-3 rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50">
                  <Icon icon={icon} size="md" className="text-cyan-700" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-sky-950">{title}</p>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-sky-950">
            <Icon icon={FishSymbol} size="md" />
            記録
          </h2>
          <RecordScreenMock />
        </section>

        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-sky-950">
            <Icon icon={Calendar} size="md" />
            履歴
          </h2>
          <HistoryScreenMock />
        </section>

        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-sky-950">
            <Icon icon={BookOpen} size="md" />
            図鑑
          </h2>
          <EncyclopediaScreenMock />
        </section>

        <section className="mt-10 rounded-xl border border-sky-200 bg-white px-4 py-4 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-sky-950">
            <Icon icon={Shield} size="md" className="text-cyan-700" />
            投稿なし。自分の記録だけ
          </h2>
          <p className="text-sm leading-relaxed text-slate-500">
            タイムラインもフォローもありません。記録・地図・図鑑は本人だけが見られます。公開の釣り場データベースはありません。
          </p>
        </section>

        <div className="mt-8 border-t border-sky-100 pt-4">
          <LegalLinks />
        </div>
      </main>
      <div className="sticky bottom-0 border-t border-sky-100 bg-white/90 backdrop-blur">
        <div className="px-4 py-3">
          <Link
            to={SIGNUP_HREF}
            aria-label="無料ではじめる"
            data-testid="signup-cta-bottom"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-base font-semibold text-white shadow-md"
          >
            <Icon icon={PlayCircle} size="sm" />
            はじめる
          </Link>
          <p className="mt-2 text-center text-sm">
            <Link to="/login" className="font-medium text-cyan-800 underline underline-offset-2">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
