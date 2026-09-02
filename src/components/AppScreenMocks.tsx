import { Fish, ImagePlus, Ruler, Scale } from 'lucide-react'
import { FishingRod } from './icons/FishingRod'
import type { ReactNode } from 'react'
import { Icon } from './ui/Icon'
import { SERVICE_NAME } from '../legal/meta'
import { GSI_STD_TILE_URL } from '../lib/gsiTiles'

/** 横浜・山下公園付近。履歴地図と同じ地理院タイルを、画面イメージ用に1枚固定する */
const HISTORY_MOCK_TILE_URL = GSI_STD_TILE_URL
  .replace('{z}', '15')
  .replace('{x}', '29095')
  .replace('{y}', '12929')

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
      <div className="mb-2 flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-sky-200 bg-white text-[11px] text-slate-400">
        <Icon icon={ImagePlus} size="sm" />
        写真
      </div>
      <div className="mb-2 flex gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
          <Icon icon={Fish} size="xs" />
          魚種
        </div>
        <div className="flex w-8 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-white text-[11px] text-slate-400">
          匹
        </div>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <div className="flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
          <Icon icon={Ruler} size="xs" />
          cm
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-[11px] text-slate-400">
          <Icon icon={Scale} size="xs" />
          g
        </div>
      </div>
      <div className="mb-2 flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-[11px] text-cyan-800">
        <Icon icon={FishingRod} size="xs" />
        タックル
      </div>
      <div className="flex items-center justify-center gap-1 rounded-lg bg-cyan-700 px-2 py-2 text-[11px] font-semibold text-white">
        <Icon icon={Fish} size="xs" className="text-white" />
        記録
      </div>
    </PhoneFrame>
  )
}

function HistoryMapPin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="1.2" rx="3.4" ry="1.4" fill="#0c4a6e" opacity="0.28" />
      <g transform="translate(-10 -33) scale(0.8)">
        <path
          d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.1 12.5 28.1S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"
          fill="#2A81CB"
        />
        <circle cx="12.5" cy="12.5" r="5.2" fill="#fff" />
      </g>
    </g>
  )
}

function HistoryMapMock() {
  return (
    <div className="relative mb-2 h-36 overflow-hidden rounded-lg border border-sky-100 bg-[#c5dff0]">
      <img
        src={HISTORY_MOCK_TILE_URL}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[35%_40%]"
        draggable={false}
      />
      <svg viewBox="0 0 240 148" className="absolute inset-0 h-full w-full">
        <HistoryMapPin x={86} y={90} />
        <HistoryMapPin x={158} y={112} />
        <g transform="translate(58 58)">
          <circle r="11" fill="#0e7490" stroke="#fff" strokeWidth="2" />
          <text
            textAnchor="middle"
            y="4"
            fill="#fff"
            fontSize="11"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            3
          </text>
        </g>
      </svg>
    </div>
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
      <HistoryMapMock />
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
      <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-lg border border-sky-100 bg-white px-2 py-1.5">
        <div>
          <p className="text-[9px] text-slate-500">魚種</p>
          <p className="text-[11px] font-semibold text-sky-950">3種</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500">釣果数</p>
          <p className="text-[11px] font-semibold text-sky-950">16匹</p>
        </div>
      </div>
      <div className="mb-1.5 rounded-md border border-sky-100 bg-white px-2 py-1 text-[9px] text-slate-400">
        魚種名・別名
      </div>
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
          ['シーバス', '8尾', 'bg-cyan-200'],
          ['アジ', '5尾', 'bg-sky-200'],
          ['クロダイ', '3尾', 'bg-teal-200'],
        ].map(([name, count, swatch]) => (
          <div
            key={name}
            className="flex items-center gap-1.5 rounded-lg border border-sky-100 bg-white px-2 py-1.5"
          >
            <span className={`h-6 w-6 shrink-0 rounded-md ${swatch}`} />
            <span className="min-w-0 flex-1 text-[11px] font-medium text-sky-950">{name}</span>
            <span className="text-[10px] text-slate-500">{count}</span>
          </div>
        ))}
      </div>
    </PhoneFrame>
  )
}
