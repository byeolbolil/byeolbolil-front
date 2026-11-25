"use client"

import { useState, type ReactNode } from "react"
import type { Coordinates } from "@/lib/tonight/settings"
import { issuedAtText } from "@/lib/tonight/time"
import type { NightQuery } from "@/lib/tonight/types"
import { useWeek } from "@/lib/tonight/use-week"
import { bestNight, weekSummary, type WeekPlace } from "@/lib/tonight/week"
import { forecastSourceName } from "@/lib/tonight/wording"
import { CalendarIcon, ChevronIcon } from "./icons"
import { WeekNightPanel, WeekStrip } from "./week-strip"

type Criteria = Pick<NightQuery, "minClearHours" | "preferBefore">

interface WeekBodyProps {
  place: WeekPlace
  dates: readonly string[]
  tonight: string
  /** 펼친 밤 아래에 놓는 버튼. 그 밤의 날짜를 받는다 */
  nightActions?: (date: string) => ReactNode
}

/**
 * 받아 온 한 장소의 일주일. 요약 한 줄, 요일 칸, 펼친 밤을 그린다. 처음에는 이번 주에서 가장 좋은 밤을 펼쳐 둔다.
 */
export function WeekBody({ place, dates, tonight, nightActions }: WeekBodyProps) {
  const initial = bestNight(place.nights)?.date ?? place.nights[0]?.date ?? null
  const [selected, setSelected] = useState<string | null>(initial)
  const night = place.nights.find((item) => item.date === selected) ?? null
  if (place.nights.length === 0) {
    return <p className="calm small">이곳의 예보를 받지 못했어요. 잠시 뒤에 다시 열어 보세요.</p>
  }
  return (
    <div className="week-body">
      <p className="week-sum">{weekSummary(place.nights, tonight)}</p>
      <WeekStrip
        dates={dates}
        nights={place.nights}
        tonight={tonight}
        selected={selected}
        onSelect={(date) => setSelected((current) => (current === date ? null : date))}
      />
      {night ? (
        <>
          <WeekNightPanel night={night} tonight={tonight} />
          {nightActions ? <div className="actions">{nightActions(night.date)}</div> : null}
        </>
      ) : null}
      <p className="week-credit">
        먼 날의 예보는 가까워질수록 달라질 수 있어요.
        {place.forecastSource ? (
          <>
            {" "}
            예보: {forecastSourceName(place.forecastSource)}
            {place.forecastIssuedAt ? ` (${issuedAtText(place.forecastIssuedAt)} 발표)` : ""}, CC BY 4.0
          </>
        ) : null}
      </p>
    </div>
  )
}

interface WeekOutlookProps {
  /** 볼 위치. 명소가 아니어도 된다 */
  position: Coordinates
  criteria: Criteria
  nightActions?: (date: string) => ReactNode
}

/** 좌표 하나의 이번 주를 받아서 그린다 */
export function WeekOutlook({ position, criteria, nightActions }: WeekOutlookProps) {
  const { status, week, reload } = useWeek(position, criteria)
  if (status === "error") {
    return (
      <p className="calm small">
        이번 주 예보를 받지 못했어요.{" "}
        <button type="button" className="linkish" onClick={reload}>
          다시 받기
        </button>
      </p>
    )
  }
  const place = week?.places[0]
  if (status !== "ready" || !week || !place) {
    return (
      <div className="week-skeleton" aria-busy="true" aria-label="이번 주 예보를 받는 중">
        {Array.from({ length: 7 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    )
  }
  return <WeekBody place={place} dates={week.dates} tonight={week.startDate} nightActions={nightActions} />
}

interface WeekSectionProps extends WeekOutlookProps {
  /** 처음부터 펼쳐 둘지. 접혀 있는 동안은 예보를 받지 않는다 */
  defaultOpen?: boolean
}

/**
 * 장소 카드 아래에 두는 "이번 주 이곳의 밤". 눌러서 펼친다.
 * 오늘 밤이 아쉬워도 며칠 뒤가 좋을 수 있어서, 같은 장소의 일주일을 한눈에 보게 한다.
 */
export function WeekSection({ position, criteria, nightActions, defaultOpen = false }: WeekSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="sec week-sec">
      <button type="button" className="fac-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <CalendarIcon />
        <span>
          <b>이곳의 이번 주</b>
          <em>오늘 밤부터 일주일, 언제가 좋은지 봐요</em>
        </span>
        <ChevronIcon />
      </button>
      {open ? <WeekOutlook position={position} criteria={criteria} nightActions={nightActions} /> : null}
    </section>
  )
}
