import { average, windowHours } from "@/lib/tonight/hours"
import { joinParts, travelText } from "@/lib/tonight/place"
import { windowText } from "@/lib/tonight/time"
import type { NightHour, NightPlace } from "@/lib/tonight/types"
import { noteText, patternText } from "@/lib/tonight/wording"
import { Rating } from "./rating"

function stripColor(hour: NightHour): string | undefined {
  if (!hour.dark) return undefined
  if (hour.clear) return `color-mix(in oklch, var(--star) ${Math.round(30 + hour.score / 1.6)}%, transparent)`
  return `color-mix(in oklch, var(--cloud) ${Math.round(10 + hour.cloudCover / 3)}%, transparent)`
}

interface PlaceRowProps {
  place: NightPlace
  /** 자세히 보기 설정이면 시간별 띠와 평균 점수를 함께 보여준다 */
  detailed: boolean
  selected?: boolean
  onOpen: (place: NightPlace) => void
}

/** 목록의 한 줄. 누르면 그 장소의 자세한 화면으로 간다. */
export function PlaceRow({ place, detailed, selected = false, onOpen }: PlaceRowProps) {
  const sub = joinParts([place.bestWindow ? windowText(place.bestWindow) : patternText(place.pattern), travelText(place.travel)])
  const note = place.notes[0]
  const score = average(windowHours(place.hours, place.bestWindow), (hour) => hour.score)

  return (
    <button type="button" className="row" aria-current={selected ? "true" : undefined} onClick={() => onOpen(place)}>
      <div>
        <div className="row-name">
          {place.name}
          {place.type === "BOOKMARK" ? <span className="mine">내 장소</span> : null}
        </div>
        <div className="row-sub">
          {sub}
          {note ? (
            <>
              {sub ? " · " : ""}
              <span className="note">{noteText(note, place)}</span>
            </>
          ) : null}
        </div>
      </div>
      <Rating level={place.level} compact />
      {detailed ? (
        <div className="x">
          <div className="strip" aria-hidden="true">
            {place.hours.map((hour) => (
              <i key={hour.time} style={{ background: stripColor(hour) }} />
            ))}
          </div>
          <span className="score">{score === null ? "–" : `평균 ${score}점`}</span>
        </div>
      ) : null}
    </button>
  )
}
