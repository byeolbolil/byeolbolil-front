import { nightTabLabel, shortDate } from "@/lib/tonight/time"

interface NightPickerProps {
  /** 고를 수 있는 날짜들. 첫 번째가 오늘 밤이다 */
  dates: readonly string[]
  selected: string
  onSelect: (date: string) => void
}

/** 어느 밤을 볼지 고른다. 오늘 밤부터 7일이다. */
export function NightPicker({ dates, selected, onSelect }: NightPickerProps) {
  const tonight = dates[0]
  return (
    <div className="nights" role="group" aria-label="밤 고르기">
      {dates.map((date) => (
        <button
          key={date}
          type="button"
          aria-pressed={date === selected}
          title={shortDate(date)}
          onClick={() => onSelect(date)}
        >
          {nightTabLabel(date, tonight)}
        </button>
      ))}
    </div>
  )
}
