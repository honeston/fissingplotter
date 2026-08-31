import { BookOpen, Key, Mail, Package, Ruler, Scale, Trash2, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { JafAttribution } from '../components/JafAttribution'
import { LegalLinks } from '../components/LegalLinks'
import { TideAttribution } from '../components/TideAttribution'
import { WeatherAttribution } from '../components/WeatherAttribution'
import { Icon } from '../components/ui/Icon'
import { MenuTile } from '../components/ui/MenuTile'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { useUnitPrefs } from '../hooks/useUnitPrefs'
import type { LengthUnit, WeightUnit } from '../lib/units'

const LENGTH_OPTIONS: { value: LengthUnit; label: string }[] = [
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'inch' },
]

const WEIGHT_OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'oz', label: 'oz' },
]

function UnitToggleGroup<T extends string>({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string
  icon: typeof Ruler
  value: T
  options: { value: T; label: string }[]
  onChange: (next: T) => void
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm font-medium text-sky-950">
        <Icon icon={icon} size="sm" className="text-cyan-700" />
        {label}
      </p>
      <div className="mt-2 flex gap-2">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`min-w-16 flex-1 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm ${
                active
                  ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                  : 'border-sky-200 bg-white text-cyan-800'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AccountLink({
  to,
  icon,
  label,
  danger,
}: {
  to: string
  icon: typeof Mail
  label: string
  danger?: boolean
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
        danger
          ? 'border-red-200 bg-red-50/50 text-red-800'
          : 'border-sky-200 bg-sky-50/50 text-cyan-800'
      }`}
    >
      <Icon icon={icon} size="sm" />
      {label}
    </Link>
  )
}

export function MyPage() {
  const { cloudEnabled, userEmail } = useAuth()
  const { prefs, setLengthUnit, setWeightUnit } = useUnitPrefs()

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <PageHeader title="マイページ" icon={User} />

      <section className="mb-6 flex flex-col gap-3">
        <MenuTile to="/mypage/tackle" icon={Package} title="タックル" testId="menu-tackle" />
        <MenuTile to="/mypage/encyclopedia" icon={BookOpen} title="図鑑" testId="menu-encyclopedia" />
      </section>

      <section className="mb-6 rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-sky-900">
          <Icon icon={Ruler} size="sm" className="text-cyan-700" />
          単位
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          <UnitToggleGroup
            label="体長"
            icon={Ruler}
            value={prefs.length}
            options={LENGTH_OPTIONS}
            onChange={setLengthUnit}
          />
          <UnitToggleGroup
            label="重さ"
            icon={Scale}
            value={prefs.weight}
            options={WEIGHT_OPTIONS}
            onChange={setWeightUnit}
          />
        </div>
      </section>

      <section className="rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-sky-900">
          <Icon icon={User} size="sm" className="text-cyan-700" />
          アカウント
        </h2>
        {cloudEnabled ? (
          <>
            <p className="mt-2 text-sm text-sky-950">
              {userEmail ? (
                <span className="flex items-center gap-1.5 truncate font-medium">
                  <Icon icon={Mail} size="sm" className="shrink-0 text-slate-400" />
                  <span className="truncate">{userEmail}</span>
                </span>
              ) : (
                <span className="text-slate-500">確認中…</span>
              )}
            </p>
            <div className="mt-3 flex flex-col gap-2 border-t border-sky-100 pt-3">
              <AccountLink to="/mypage/email" icon={Mail} label="メール変更" />
              <AccountLink to="/mypage/password" icon={Key} label="パスワード" />
              <AccountLink to="/mypage/delete-account" icon={Trash2} label="退会" danger />
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">端末に保存（クラウド未設定）</p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm">
        <LegalLinks className="mt-1" />
      </section>

      <section className="mt-auto space-y-1 pt-6">
        {cloudEnabled && (
          <>
            <WeatherAttribution />
            <TideAttribution />
          </>
        )}
        <JafAttribution />
      </section>
    </main>
  )
}
