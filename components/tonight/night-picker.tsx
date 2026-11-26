import { nightName, nightTabLabel, shortDate } from "@/lib/tonight/time"
import type { RecommendationLevel } from "@/lib/tonight/types"
import { levelStars, levelText } from "@/lib/tonight/wording"
import { CloudIcon, StarIcon } from "./icons"

interface NightPickerProps {
  /** 고를 수 있는 날짜들. 첫 번째가 오늘 밤이다 */
  dates: readonly string[]
  selected: string
  onSelect: (date: string) => void
  /** 밤마다 후보 가운데 가장 좋은 곳의 등급. 평가한 곳이 없는 밤은 들어 있지 않다 */
  levels: ReadonlyMap<string, RecommendationLevel>
  /** 밤마다의 등급을 다 받았는지. 받기 전이거나 받지 못했으면 등급이 없는 밤의 자리를 비워 둔다 */
  settled: boolean
  /**
   * 밤마다 별 보기 좋은 곳의 수. 주면 칸의 아래 줄에 별 대신 "8곳"처럼 적는다. 후보 목록의 밤을 고를 때 쓴다.
   * 칸 모양은 장소 화면의 날짜 칸(그 장소의 일곱 밤, 별)과 같고, 아래 줄이 말하는 것이 달라서 둘이 구분된다
   */
  counts?: ReadonlyMap<string, number>
}

/**
 * 어느 밤을 볼지 고른다. 오늘 밤부터 7일이다. 칸마다 밤의 이름 아래에 날짜를 적고, 그 밤에 가장 좋은 곳의 등급을
 * 별의 수로(별 보기 어려운 밤은 구름으로) 그려서 눌러 보기 전에 어느 밤이 좋은지 알 수 있게 한다.
 */
export function NightPicker({ dates, selected, onSelect, levels, settled, counts }: NightPickerProps) {
  const tonight = dates[0]
  return (
    <div className={counts ? "nights night-counts" : "nights"} role="group" aria-label={counts ? "후보를 볼 밤" : "이 장소의 밤"}>
      {dates.map((date) => {
        const level = levels.get(date)
        const count = counts?.get(date)
        const summary = counts
          ? count !== undefined
            ? `별 보기 좋은 곳 ${count}곳`
            : settled
              ? "정보 없음"
              : null
          : level
            ? levelText(level)
            : settled
              ? "정보 없음"
              : null
        const label = [`${nightName(date, tonight)} ${spokenDate(date)}`, summary].filter(Boolean).join(", ")
        return (
          <button
            key={date}
            type="button"
            data-level={level ?? "NONE"}
            data-count={count}
            aria-pressed={date === selected}
            aria-label={label}
            title={label}
            onClick={() => onSelect(date)}
          >
            <span className="nt-name">{nightTabLabel(date, tonight)}</span>
            <span className="nt-date">{shortDate(date)}</span>
            <span className="nt-mark" aria-hidden="true">
              {counts ? (count !== undefined ? `${count}곳` : settled ? "–" : null) : <Mark level={level} settled={settled} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Mark({ level, settled }: { level: RecommendationLevel | undefined; settled: boolean }) {
  // 예보가 닿지 않거나 갈 수 있는 곳이 없어서 평가하지 못한 밤
  if (!level) return settled ? "–" : null
  const stars = levelStars(level)
  if (stars === 0) return <CloudIcon />
  return Array.from({ length: stars }, (_, index) => <StarIcon key={index} filled />)
}

/** "11월 26일". 화면 낭독기에 읽어 줄 날짜다 */
function spokenDate(date: string): string {
  const [, month, day] = date.split("-").map(Number)
  return `${month}월 ${day}일`
}
