import { Plus } from 'lucide-react'
import { FishingRod } from '../components/icons/FishingRod'
import { useCallback, useEffect, useState } from 'react'
import { TackleFieldsForm } from '../components/TackleFieldsForm'
import { IconButton } from '../components/ui/IconButton'
import { PageHeader } from '../components/ui/PageHeader'
import { listMyTackles, MY_TACKLE_EVENT, removeMyTackle, saveMyTackle } from '../lib/myTackle'
import {
  EMPTY_TACKLE_FIELDS,
  hasTackleContent,
  tackleFromMyTackle,
  type MyTackle,
  type TackleFields,
} from '../types/tackle'

function summaryLine(tackle: MyTackle): string {
  const parts = [tackle.rod, tackle.reel, tackle.lureOrBait, tackle.rig].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : '詳細なし'
}

export function MyTacklePage() {
  const [tackles, setTackles] = useState<MyTackle[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TackleFields>(EMPTY_TACKLE_FIELDS)
  const [creating, setCreating] = useState(false)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setTackles(await listMyTackles())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    const onChange = () => void reload()
    window.addEventListener(MY_TACKLE_EVENT, onChange)
    return () => window.removeEventListener(MY_TACKLE_EVENT, onChange)
  }, [reload])

  function startCreate() {
    setCreating(true)
    setCopying(false)
    setEditingId(null)
    setDraft(EMPTY_TACKLE_FIELDS)
    setError('')
    window.scrollTo(0, 0)
  }

  function startCopy(tackle: MyTackle) {
    const fields = tackleFromMyTackle(tackle)
    setCreating(true)
    setCopying(true)
    setEditingId(null)
    setDraft({
      ...fields,
      name: fields.name ? `${fields.name}のコピー` : '',
    })
    setError('')
    window.scrollTo(0, 0)
  }

  function startEdit(tackle: MyTackle) {
    setCreating(false)
    setCopying(false)
    setEditingId(tackle.id)
    setDraft(tackleFromMyTackle(tackle))
    setError('')
    window.scrollTo(0, 0)
  }

  function cancelForm() {
    setCreating(false)
    setCopying(false)
    setEditingId(null)
    setDraft(EMPTY_TACKLE_FIELDS)
    setError('')
  }

  async function handleSave() {
    if (!hasTackleContent(draft)) {
      setError('いずれかの項目を入力してください')
      return
    }
    setBusy(true)
    setError('')
    try {
      await saveMyTackle(draft, editingId ?? undefined)
      cancelForm()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('このマイタックルを削除しますか？')) return
    setBusy(true)
    try {
      await removeMyTackle(id)
      if (editingId === id) cancelForm()
      await reload()
    } finally {
      setBusy(false)
    }
  }

  const showForm = creating || editingId != null

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <PageHeader title="マイタックル" icon={FishingRod} backTo="/mypage" backLabel="戻る" />

      {!showForm && (
        <IconButton
          icon={Plus}
          label="新しいタックルを追加"
          onClick={startCreate}
          variant="secondary"
          fullWidth
          className="mb-4 border-cyan-600 bg-cyan-50 text-cyan-900"
        >
          追加
        </IconButton>
      )}

      {showForm && (
        <section className="mb-6 rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-sky-900">
            {editingId ? 'タックルを編集' : copying ? 'コピーして追加' : 'タックルを追加'}
          </h2>
          {copying && (
            <p className="mb-3 text-xs text-slate-500">
              内容を変えて保存すると、元のタックルとは別に残ります。
            </p>
          )}
          <TackleFieldsForm
            value={draft}
            onChange={setDraft}
            disabled={busy}
            idPrefix="my-tackle"
          />
          {error && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy}
              className="flex-1 rounded-xl bg-cyan-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              保存
            </button>
            <button
              type="button"
              onClick={cancelForm}
              disabled={busy}
              className="flex-1 rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-medium text-cyan-800 disabled:opacity-60"
            >
              キャンセル
            </button>
          </div>
        </section>
      )}

      {loading && <p className="text-sm text-slate-500">読み込み中…</p>}

      {!loading && tackles.length === 0 && !showForm && (
        <p className="rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
          まだマイタックルがありません
        </p>
      )}

      {!loading && tackles.length > 0 && !creating && (
        <ul className="flex flex-col gap-3">
          {tackles.map((tackle) => (
            <li
              key={tackle.id}
              className="rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm"
            >
              <p className="font-medium text-sky-950">{tackle.name || '（無題）'}</p>
              <p className="mt-1 text-sm text-slate-500">{summaryLine(tackle)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(tackle)}
                  disabled={busy}
                  className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm font-medium text-cyan-800 disabled:opacity-60"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => startCopy(tackle)}
                  disabled={busy}
                  className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm font-medium text-cyan-800 disabled:opacity-60"
                >
                  コピー
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(tackle.id)}
                  disabled={busy}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 disabled:opacity-60"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
