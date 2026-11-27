"use client"

import { useEffect, useState } from "react"
import { fetchMoon, type MoonCalendar } from "@/lib/tonight/api"
import { moonPhaseName, moonTimesText } from "@/lib/tonight/moon"
import { calendarNightName, calendarWeeks, durationText, moonlessShare, moonlessSpansText } from "@/lib/tonight/moon-calendar"
import type { Coordinates } from "@/lib/tonight/settings"
import { MoonPhase } from "./gauges"
import { Sheet } from "./sheet"

interface MoonSheetProps {
  /** 시각을 계산할 자리. 지금 보는 장소, 없으면 출발지다 */
  position: Coordinates
  /** 그 자리의 이름. 시각이 어느 곳 기준인지 알린다 */
  placeName: string
  /** 예보가 있는 밤. 이 밤을 고르면 그 밤의 예보로 가는 버튼을 보여 준다 */
  forecastDates: readonly string[]
  onOpenNight: (date: string) => void
  onClose: () => void
}

type State = { status: "loading" } | { status: "ready"; calendar: MoonCalendar } | { status: "error" }

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

/**
 * 앞으로 6주의 달. 칸마다 달 모양과, 달 없이 어두운 시간만큼 차는 막대를 그린다.
 * 칸을 누르면 아래에 그 밤의 달 없는 구간과 달이 뜨고 지는 시각을 적는다. 날씨는 보지 않는다.
 */
export function MoonSheet({ position, placeName, forecastDates, onOpenNight, onClose }: MoonSheetProps) {
  const [state, setState] = useState<State>({ status: "loading" })
  const [selected, setSelected] = useState<string | null>(null)
  const { lat, lon } = position

  useEffect(() => {
    const controller = new AbortController()
    fetchMoon({ lat, lon }, controller.signal)
      .then((calendar) => setState({ status: "ready", calendar }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setState({ status: "error" })
      })
    return () => controller.abort()
  }, [lat, lon])

  return (
    <Sheet title="달 없는 밤" onClose={onClose}>
      {state.status === "ready" && state.calendar.nights.length > 0 ? (
        <Calendar
          calendar={state.calendar}
          selected={selected ?? state.calendar.nights[0].date}
          onSelect={setSelected}
          placeName={placeName}
          forecastDates={forecastDates}
          onOpenNight={onOpenNight}
        />
      ) : (
        <p className="calm">{state.status === "error" ? "달력을 받지 못했어요." : "달을 살펴보는 중이에요."}</p>
      )}
    </Sheet>
  )
}

function Calendar({
  calendar,
  selected,
  onSelect,
  placeName,
  forecastDates,
  onOpenNight,
}: {
  calendar: MoonCalendar
  selected: string
  onSelect: (date: string) => void
  placeName: string
  forecastDates: readonly string[]
  onOpenNight: (date: string) => void
}) {
  const { nights, startDate } = calendar
  const night = nights.find((item) => item.date === selected) ?? nights[0]
  const spans = moonlessSpansText(night)
  const moonTimes = moonTimesText(night.moon)

  return (
    <div className="moon-cal">
      <p className="mc-basis">{placeName}에서 본 시각</p>
      <div className="mc-grid" role="group" aria-label="앞으로 6주의 달">
        <div className="mc-row mc-head" aria-hidden="true">
          {WEEKDAYS.map((day, index) => (
            <span key={day} data-weekday={index}>
              {day}
            </span>
          ))}
        </div>
        {calendarWeeks(nights).map((week, row) => (
          <div className="mc-row" key={row}>
            {week.map((cell, column) => {
              if (!cell) return <span key={column} className="mc-empty" />
              const [, month, day] = cell.date.split("-").map(Number)
              // 달이 바뀌는 날과 첫 칸에만 몇 월인지 적는다
              const label = day === 1 || cell.date === startDate ? `${month}/${day}` : String(day)
              const minutes = durationText(cell.moonlessMinutes)
              return (
                <button
                  key={cell.date}
                  type="button"
                  aria-pressed={cell.date === night.date}
                  aria-label={`${calendarNightName(cell.date, startDate)}, ${moonPhaseName(cell.moon)}, ${
                    minutes ? `달 없이 ${minutes}` : "밤새 달이 떠 있어요"
                  }`}
                  data-today={cell.date === startDate ? "1" : undefined}
                  onClick={() => onSelect(cell.date)}
                >
                  <span className="mc-day">{label}</span>
                  <MoonPhase moon={cell.moon} brightness={0} up size={34} />
                  <span className="mc-bar" aria-hidden="true">
                    <i style={{ width: `${Math.round(moonlessShare(cell, nights) * 100)}%` }} />
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <section className="mc-detail" aria-live="polite">
        <div className="mc-name">{calendarNightName(night.date, startDate)}</div>
        <strong className="mc-hours">
          {night.moonlessMinutes > 0 ? `달 없이 ${durationText(night.moonlessMinutes)}` : "밤새 달이 떠 있어요"}
        </strong>
        {spans.map((text) => (
          <div className="mc-span" key={text}>
            {text}
          </div>
        ))}
        <div className="mc-moon">
          <MoonPhase moon={night.moon} brightness={0} up size={28} />
          <span>{[moonPhaseName(night.moon), moonTimes].filter(Boolean).join(" · ")}</span>
        </div>
        {forecastDates.includes(night.date) ? (
          <button type="button" className="btn" onClick={() => onOpenNight(night.date)}>
            이 밤 예보 보기
          </button>
        ) : null}
      </section>
    </div>
  )
}
