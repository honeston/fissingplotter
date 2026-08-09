import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RecordProgress } from '../components/RecordProgress'
import { useRecord } from '../hooks/useRecord'

export function HomePage() {
  const [fishSpecies, setFishSpecies] = useState('')
  const { busy, steps, errors, lastResult, record, reset } = useRecord()
  const [fatalError, setFatalError] = useState('')

  async function handleRecord() {
    setFatalError('')
    reset()
    try {
      await record(fishSpecies.trim() || null)
      setFishSpecies('')
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : '記録に失敗しました')
    }
  }

  const saved = lastResult?.record

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-8 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">Fissing Plotter</p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">記録</h1>
        </div>
        <Link
          to="/history"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          履歴
        </Link>
      </header>

      <label className="mb-2 block text-sm font-medium text-sky-900" htmlFor="fish">
        魚種（任意）
      </label>
      <input
        id="fish"
        type="text"
        inputMode="text"
        autoComplete="off"
        placeholder="例: アジ"
        value={fishSpecies}
        onChange={(e) => setFishSpecies(e.target.value)}
        disabled={busy}
        className="mb-4 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
      />

      <p className="mb-4 text-sm text-slate-500">
        ボタンを押すと、現在地・気温・潮位を取得して保存します（オフライン時は端末のみ）。
      </p>

      <RecordProgress steps={steps} errors={errors} />

      {fatalError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {fatalError}
        </p>
      )}

      {saved && (
        <section
          className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950"
          role="status"
        >
          <p className="font-semibold">保存しました</p>
          <p className="mt-1 text-xs text-cyan-800">
            {new Date(saved.recordedAt).toLocaleString('ja-JP')}
            {saved.fishSpecies ? ` / ${saved.fishSpecies}` : ''}
          </p>
          <dl className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt>座標</dt>
              <dd>
                {saved.latitude.toFixed(5)}, {saved.longitude.toFixed(5)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>気温</dt>
              <dd>{saved.temperature != null ? `${saved.temperature}℃` : '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>潮位</dt>
              <dd>
                {saved.tideLevel != null ? `${saved.tideLevel} cm` : '—'}
                {saved.tideHarbor ? `（${saved.tideHarbor}）` : ''}
              </dd>
            </div>
          </dl>
          {lastResult.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-xs text-amber-800">
              {lastResult.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <Link to="/history" className="mt-3 inline-block font-medium text-cyan-800 underline">
            履歴を見る
          </Link>
        </section>
      )}

      <div className="mt-auto">
        <button
          type="button"
          onClick={() => void handleRecord()}
          disabled={busy}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-700 px-4 py-3 text-base font-semibold text-white shadow-md transition enabled:active:scale-[0.98] enabled:hover:bg-cyan-800 disabled:opacity-60"
        >
          {busy ? '記録中…' : '記録する'}
        </button>
      </div>
    </main>
  )
}
