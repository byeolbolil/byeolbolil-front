import type { ReactNode } from "react"
import { clearRuns } from "@/lib/tonight/hours"
import { placeKey } from "@/lib/tonight/place"
import { windowText } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { HeroCard } from "./hero-card"

interface DetailViewProps {
  place: NightPlace
  /** "오늘 밤", "내일 밤" 같은 밤의 이름 */
  nightName: string
  detailed: boolean
  onBack: () => void
  actions?: ReactNode
  children?: ReactNode
}

/** 장소 하나를 자세히 보는 화면. 목록이나 지도에서 장소를 고르면 열린다. */
export function DetailView({ place, nightName, detailed, onBack, actions, children }: DetailViewProps) {
  const runs = clearRuns(place.hours)
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
    </>
  )
}
