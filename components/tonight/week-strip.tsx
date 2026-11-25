"use client"

import { levelReason } from "@/lib/tonight/facts"
import { nightName, shortDate, windowText } from "@/lib/tonight/time"
import type { NightHour } from "@/lib/tonight/types"
import { dayLabel, type WeekNight } from "@/lib/tonight/week"
import { levelStars, levelText, noteText } from "@/lib/tonight/wording"
import { MoonPhase } from "./gauges"
import { CloudIcon, StarIcon } from "./icons"

interface WeekStripProps {
  /** 오늘 밤부터 7일의 날짜 */
  dates: readonly string[]
  nights: readonly WeekNight[]
  /** 오늘 밤의 날짜 */
  tonight: string
  /** 펼쳐 둔 밤. 없으면 아무 칸도 눌려 있지 않다 */
  selected: string | null
  onSelect: (date: string) => void
}

/**
 * 한 장소의 일주일을 요일 칸 일곱 개로 보여 준다. 칸마다 그 밤의 등급을 별의 수로, 별 보기 어려운 밤은 구름으로
 * 그린다. 칸을 누르면 그 밤을 아래에 펼친다. 예보가 닿지 않는 밤은 빈칸이다.
 */
export function WeekStrip({ dates, nights, tonight, selected, onSelect }: WeekStripProps) {
  const byDate = new Map(nights.map((night) => [night.date, night]))
  return (
    <div className="week" role="group" aria-label="이번 주 밤">
      {dates.map((date) => {
        const night = byDate.get(date)
        const label = dayLabel(date, tonight)
        if (!night) {
          return (
            <span key={date} className="wk" data-level="NONE" title={`${shortDate(date)} 예보 없음`}>
              <span className="wk-day">{label}</span>
              <span className="wk-mark">–</span>
              <span className="wk-date">{shortDate(date)}</span>
            </span>
          )
        }
        const stars = levelStars(night.level)
        return (
          <button
            key={date}
            type="button"
            className="wk"
            data-level={night.level}
            aria-pressed={selected === date}
            aria-label={`${nightName(date, tonight)}, ${levelText(night.level)}`}
            onClick={() => onSelect(date)}
          >
            <span className="wk-day">{label}</span>
            <span className="wk-mark" aria-hidden="true">
              {stars === 0 ? <CloudIcon /> : Array.from({ length: stars }, (_, index) => <StarIcon key={index} filled />)}
            </span>
            <span className="wk-date">{shortDate(date)}</span>
          </button>
        )
      })}
    </div>
  )
}

function stripColor(hour: NightHour): string | undefined {
  if (!hour.dark) return undefined
  if (hour.clear) return `color-mix(in oklch, var(--star) ${Math.round(30 + hour.score / 1.6)}%, transparent)`
  return `color-mix(in oklch, var(--cloud) ${Math.round(10 + hour.cloudCover / 3)}%, transparent)`
}

interface WeekNightPanelProps {
  night: WeekNight
  tonight: string
}

/** 요일 칸을 눌렀을 때 펼치는 그 밤의 요약: 등급과 이유, 추천 시간대, 달, 시간별 띠 */
export function WeekNightPanel({ night, tonight }: WeekNightPanelProps) {
  const note = night.notes.find((item) => item !== "CLEARS_LATE" && item !== "BRIGHT_MOON" && item !== "CITY_LIGHTS")
  const moonUp = night.hours.some((hour) => hour.dark && hour.moonUp)
  return (
    <div className="wk-panel" data-level={night.level}>
      <div className="wk-head">
        <b>
          {nightName(night.date, tonight)} · {levelText(night.level)}
        </b>
        <span>{levelReason(night)}</span>
      </div>
      <div className="wk-facts">
        <div>
          <span className="label">볼 만한 시간</span>
          <strong>{night.bestWindow ? windowText(night.bestWindow) : "없어요"}</strong>
          {night.bestWindow ? <em>{night.bestWindow.hours}시간</em> : null}
        </div>
        {night.moon ? (
          <div className="wk-moon">
            <MoonPhase moon={night.moon} brightness={night.moonBrightness} up={moonUp} size={30} />
            <span>
              <span className="label">달</span>
              <strong>{moonUp ? `밝기 ${Math.round(night.moonBrightness * 100)}%` : "밤에 뜨지 않아요"}</strong>
            </span>
          </div>
        ) : null}
      </div>
      {night.hours.length > 0 ? (
        <div className="strip" aria-hidden="true">
          {night.hours.map((hour) => (
            <i key={hour.time} style={{ background: stripColor(hour) }} />
          ))}
        </div>
      ) : null}
      {note ? <p className="wk-note">{noteText(note, night)}</p> : null}
    </div>
  )
}
