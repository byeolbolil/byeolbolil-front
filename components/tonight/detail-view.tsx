"use client"

import { useState, type ReactNode } from "react"
import { clearRuns } from "@/lib/tonight/hours"
import { placeKey } from "@/lib/tonight/place"
import { windowText } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { ForecastCredit } from "./forecast-credit"
import { HeroCard } from "./hero-card"
import { PlaceRow } from "./place-row"

/** 처음에 보여주는 다른 후보의 수. 나머지는 "더 보기"로 편다 */
const SHORT_LIST = 5

interface DetailViewProps {
  place: NightPlace
  /** "오늘 밤", "내일 밤" 같은 밤의 이름 */
  nightName: string
  detailed: boolean
  /** 같은 밤의 다른 후보. 추천 순서대로다 */
  others: readonly NightPlace[]
  onOpenPlace: (place: NightPlace) => void
  onBack: () => void
  actions?: ReactNode
  children?: ReactNode
}

/**
 * 장소 하나를 자세히 보는 화면. 목록이나 지도에서 장소를 고르면 열린다.
 * 아래에 다른 후보를 함께 두어서, 목록으로 돌아가지 않고도 후보 사이를 오갈 수 있다.
 */
export function DetailView({ place, nightName, detailed, others, onOpenPlace, onBack, actions, children }: DetailViewProps) {
  const [showAll, setShowAll] = useState(false)
  const runs = clearRuns(place.hours)
  const shown = showAll ? others : others.slice(0, SHORT_LIST)
  const hidden = others.length - shown.length
  return (
    <>
      <button type="button" className="btn ghost back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        돌아가기
      </button>
      <HeroCard key={placeKey(place)} place={place} eyebrow={nightName} detailed={detailed} actions={actions}>
        {children}
      </HeroCard>
      {runs.length > 1 ? (
        <p className="calm small">맑은 시간이 여러 번 있어요: {runs.map((run) => windowText(run)).join(", ")}</p>
      ) : null}
      {others.length > 0 ? (
        <section className="sec">
          <div className="sec-title">
            <h2>다른 후보</h2>
            <p>{nightName} 추천 순서대로</p>
          </div>
          <div className="rows">
            {shown.map((other) => (
              <PlaceRow key={placeKey(other)} place={other} detailed={detailed} onOpen={onOpenPlace} />
            ))}
          </div>
          {others.length > SHORT_LIST ? (
            <button type="button" className="showmore" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "접기" : `${hidden}곳 더 보기`}
            </button>
          ) : null}
        </section>
      ) : null}
      <ForecastCredit places={[place]} />
    </>
  )
}
