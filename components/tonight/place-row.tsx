import { average, windowHours } from "@/lib/tonight/hours"
import { joinParts, travelText } from "@/lib/tonight/place"
import { windowText } from "@/lib/tonight/time"
import type { NightHour, NightPlace } from "@/lib/tonight/types"
import { noteText, patternText } from "@/lib/tonight/wording"
import { BookmarkIcon } from "./icons"
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
  /** 지금 카드에 떠 있는 장소인지 */
  selected?: boolean
  /** 그 밤의 추천 순서. 순서가 뜻을 갖는 목록에서만 넘긴다 */
  rank?: number
  onOpen: (place: NightPlace) => void
}

/** 목록의 한 줄. 누르면 그 장소를 카드에 띄운다. */
export function PlaceRow({ place, detailed, selected = false, rank, onOpen }: PlaceRowProps) {
  const sub = joinParts([place.bestWindow ? windowText(place.bestWindow) : patternText(place.pattern), travelText(place.travel)])
  const note = place.notes[0]
  const score = average(windowHours(place.hours, place.bestWindow), (hour) => hour.score)

  return (
    <button
      type="button"
      className={rank === undefined ? "row" : "row ranked"}
      aria-current={selected ? "true" : undefined}
      onClick={() => onOpen(place)}
    >
      {rank === undefined ? null : (
        <span className="row-rank" aria-label={`${rank}번째`}>
          {rank}
        </span>
      )}
      <div>
        <div className="row-name">
          {place.name}
          {place.type === "BOOKMARK" ? (
            <span className="mine">
              <BookmarkIcon filled />내 장소
            </span>
          ) : null}
        </div>
        <div className="row-sub">
          {sub}
          {note ? (
            <>
              {sub ? <span className="sep"> · </span> : null}
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
