"use client"

import { useMemo, useState } from "react"
import { directionsUrl, joinParts, regionOf } from "@/lib/tonight/place"
import type { Coordinates } from "@/lib/tonight/settings"
import { distanceText, nearestFirst, type FacilityWithDistance } from "@/lib/tonight/spots"
import { useFacilities } from "@/lib/tonight/use-facilities"
import { ChevronIcon, TelescopeIcon } from "./icons"
import { PlaceAbout } from "./place-about"

/** 처음에 보여주는 수. 나머지는 "더 보기"로 편다 */
const SHORT_LIST = 5

interface FacilityListProps {
  /** 출발 위치. 알면 가까운 순으로 놓는다 */
  origin: Coordinates | null
}

/**
 * 천문대와 과학관. 예약한 프로그램이나 운영 시간에 맞춰 망원경을 보는 곳이라 밤 추천 순위에는 넣지 않고 따로 둔다.
 * 처음에는 접혀 있고, 펼쳤을 때 목록을 받는다.
 */
export function FacilityList({ origin }: FacilityListProps) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const { status, facilities } = useFacilities(open)
  const sorted = useMemo(() => nearestFirst(facilities, origin), [facilities, origin])
  const shown = showAll ? sorted : sorted.slice(0, SHORT_LIST)
  const hidden = sorted.length - shown.length

  return (
    <section className="sec facilities">
      <button type="button" className="fac-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <TelescopeIcon />
        <span>
          <b>망원경으로 보고 싶다면</b>
          <em>천문대와 과학관은 예약하거나 운영 시간에 맞춰 가는 곳이라 따로 모았어요</em>
        </span>
        <ChevronIcon />
      </button>
      {open && status === "loading" ? <p className="calm small">목록을 불러오고 있어요.</p> : null}
      {open && status === "error" ? <p className="calm small">지금은 목록을 불러오지 못했어요. 잠시 뒤에 다시 펼쳐 주세요.</p> : null}
      {open && status === "ready" ? (
        <>
          <p className="calm small">
            {origin ? "가까운 순서예요. " : ""}오늘 밤 날씨는 평가하지 않았어요. 가기 전에 운영 여부를 확인하세요.
          </p>
          <div className="rows">
            {shown.map((facility) => (
              <FacilityRow
                key={facility.id}
                facility={facility}
                open={expanded === facility.id}
                onToggle={() => setExpanded((current) => (current === facility.id ? null : facility.id))}
              />
            ))}
          </div>
          {sorted.length > SHORT_LIST ? (
            <button type="button" className="showmore" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "접기" : `${hidden}곳 더 보기`}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

interface FacilityRowProps {
  facility: FacilityWithDistance
  open: boolean
  onToggle: () => void
}

function FacilityRow({ facility, open, onToggle }: FacilityRowProps) {
  const sub = joinParts([regionOf(facility.address), distanceText(facility.distanceKm)])
  return (
    <div className="fac" data-open={open}>
      <button type="button" className="row" aria-expanded={open} onClick={onToggle}>
        <div>
          <div className="row-name">{facility.title}</div>
          <div className="row-sub">{sub}</div>
        </div>
        <ChevronIcon />
      </button>
      {open ? (
        <div className="fac-body">
          <PlaceAbout description={facility.description} guide={facility.guide} caution={facility.caution} facility />
          <div className="actions">
            <a
              className="btn"
              href={directionsUrl({ name: facility.title, latitude: facility.latitude, longitude: facility.longitude })}
              target="_blank"
              rel="noopener noreferrer"
            >
              길찾기
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}
