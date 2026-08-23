import type { TackleFields } from '../types/tackle'

const FIELD_CLASS =
  'w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-sky-950 shadow-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60'

const FIELDS: { key: keyof TackleFields; label: string; placeholder: string }[] = [
  { key: 'name', label: 'セット名', placeholder: '例: シーバスセット' },
  { key: 'rod', label: 'ロッド', placeholder: '例: ○ft ML' },
  { key: 'reel', label: 'リール', placeholder: '例: 2500番' },
  { key: 'line', label: 'ライン', placeholder: '例: PE 1.0号' },
  { key: 'lureOrBait', label: 'ルアー／エサ', placeholder: '例: ミノー / アオイソメ' },
  { key: 'rig', label: '仕掛け', placeholder: '例: フロロリーダー 8lb' },
]

interface TackleFieldsFormProps {
  value: TackleFields
  onChange: (next: TackleFields) => void
  disabled?: boolean
  idPrefix?: string
}

export function TackleFieldsForm({
  value,
  onChange,
  disabled,
  idPrefix = 'tackle',
}: TackleFieldsFormProps) {
  function update(key: keyof TackleFields, next: string) {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="flex flex-col gap-3">
      {FIELDS.map(({ key, label, placeholder }) => {
        const id = `${idPrefix}-${key}`
        return (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium text-sky-900" htmlFor={id}>
              {label}
            </label>
            <input
              id={id}
              type="text"
              value={value[key]}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className={FIELD_CLASS}
            />
          </div>
        )
      })}
    </div>
  )
}
