import { useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { ja } from 'react-day-picker/locale'
import { datesWithRecords, toDateKey } from '../lib/dates'
import type { FishingRecord } from '../types/record'

interface HistoryCalendarProps {
  records: FishingRecord[]
  selectedDate: Date | undefined
  onSelectDate: (date: Date | undefined) => void
}

export function HistoryCalendar({
  records,
  selectedDate,
  onSelectDate,
}: HistoryCalendarProps) {
  const recordDates = useMemo(() => datesWithRecords(records), [records])

  const modifiers = useMemo(
    () => ({
      hasRecord: (date: Date) => recordDates.has(toDateKey(date)),
    }),
    [recordDates],
  )

  return (
    <div className="rounded-xl border border-sky-100 bg-white p-3 shadow-sm">
      <DayPicker
        mode="single"
        locale={ja}
        selected={selectedDate}
        onSelect={onSelectDate}
        modifiers={modifiers}
        modifiersClassNames={{
          hasRecord:
            'relative after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-cyan-600',
          selected: 'bg-cyan-700 text-white rounded-md',
          today: 'font-bold text-cyan-800',
        }}
        classNames={{
          root: 'w-full text-sm',
          months: 'flex flex-col',
          month: 'space-y-2',
          month_caption: 'flex items-center justify-center gap-2 font-medium text-sky-950',
          nav: 'flex items-center gap-1',
          button_previous:
            'rounded-md px-2 py-1 text-cyan-800 hover:bg-sky-50 disabled:opacity-30',
          button_next:
            'rounded-md px-2 py-1 text-cyan-800 hover:bg-sky-50 disabled:opacity-30',
          weekdays: 'flex',
          weekday: 'w-9 text-center text-xs text-slate-400',
          week: 'flex',
          day: 'flex h-9 w-9 items-center justify-center p-0',
          day_button:
            'h-9 w-9 rounded-md text-sm hover:bg-sky-50 disabled:opacity-30',
          outside: 'text-slate-300',
        }}
      />
    </div>
  )
}
