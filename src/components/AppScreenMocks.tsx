import type { ReactNode } from 'react'
import { SERVICE_NAME } from '../legal/meta'

function PhoneFrame({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <figure className="my-4">
      <div className="mx-auto w-[min(100%,16.5rem)] overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">
        <div className="border-b border-sky-100 bg-sky-50 px-3 py-2">
          <p className="text-[10px] font-medium tracking-wide text-cyan-700">{SERVICE_NAME}</p>
          <p className="text-sm font-semibold text-sky-950">{title}</p>
        </div>
        <div className="bg-[#f0f9ff] px-3 py-3" aria-hidden>
          {children}
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-slate-500">
        画面イメージ（{title}）
      </figcaption>
    </figure>
  )
}

export function RecordScreenMock() {
  return (
    <PhoneFrame title="記録">
      <div className="mb-2 flex h-16 items-center justify-center rounded-lg border border-dashed border-sky-200 bg-white text-[11px] text-slate-400">
        写真を追加
      </div>
      <div className="mb-2 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
        魚種（任意）
      </div>
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
          体長
        </div>
        <div className="rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
          重さ
        </div>
      </div>
      <div className="mb-2 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-[11px] text-cyan-800">
        タックル入力を開く
      </div>
      <div className="rounded-lg bg-cyan-700 px-2 py-2 text-center text-[11px] font-semibold text-white">
        記録する
      </div>
    </PhoneFrame>
  )
}

export function HistoryScreenMock() {
  return (
    <PhoneFrame title="履歴">
      <div className="mb-2 grid grid-cols-7 gap-0.5 text-center text-[9px] text-slate-400">
        {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
          <span key={day}>{day}</span>
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className={`rounded py-1 ${i === 9 ? 'bg-cyan-700 font-semibold text-white' : 'text-sky-900'}`}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <div className="mb-2 h-16 rounded-lg border border-sky-100 bg-gradient-to-br from-sky-100 to-cyan-50" />
      <div className="rounded-lg border border-sky-100 bg-white px-2 py-2">
        <p className="text-[11px] font-medium text-sky-950">シーバス · 42 cm</p>
        <p className="mt-0.5 text-[10px] text-slate-500">気温 18℃ · 潮位 124 cm</p>
      </div>
    </PhoneFrame>
  )
}

export function EncyclopediaScreenMock() {
  return (
    <PhoneFrame title="マイ魚種図鑑">
      <div className="mb-2 flex gap-1">
        {['数', '魚種', '最大サイズ'].map((label, i) => (
          <span
            key={label}
            className={`rounded-md border px-1.5 py-0.5 text-[10px] ${
              i === 0
                ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                : 'border-sky-200 bg-white text-slate-500'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="space-y-1.5">
        {[
          ['シーバス', '8尾'],
          ['アジ', '5尾'],
          ['クロダイ', '3尾'],
        ].map(([name, count]) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-lg border border-sky-100 bg-white px-2 py-1.5"
          >
            <span className="text-[11px] font-medium text-sky-950">{name}</span>
            <span className="text-[10px] text-slate-500">{count}</span>
          </div>
        ))}
      </div>
    </PhoneFrame>
  )
}
