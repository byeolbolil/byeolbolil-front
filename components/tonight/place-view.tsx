"use client"

import { useMemo, useState, type ReactNode } from "react"
import { nightName } from "@/lib/tonight/time"
import type { NightPlace, NightQuery, RecommendationLevel } from "@/lib/tonight/types"
import { useWeek } from "@/lib/tonight/use-week"
import type { WeekNight, WeekPlace } from "@/lib/tonight/week"
import { HeroCard } from "./hero-card"
import { ChevronIcon } from "./icons"
import { NightPicker } from "./night-picker"

interface PlaceViewProps {
  /** 목록이나 지도에서 고른 장소. `placeDate` 밤의 값이 들어 있다 */
  place: NightPlace
  /** `place`가 담고 있는 밤의 날짜. 처음에는 이 밤을 보여 준다 */
  placeDate: string
  /** 오늘 밤부터 7일 */
  dates: readonly string[]
  criteria: Pick<NightQuery, "minClearHours" | "preferBefore">
  /** 저장 버튼 */
  save?: ReactNode
  /** 목록으로 돌아간다 */
  onBack: () => void
}

/**
 * 장소 하나의 화면. 위의 날짜 줄은 이 장소의 일곱 밤이고, 날짜를 눌러도 장소는 그대로다.
 * 목록 화면의 날짜 줄(그 밤에 전국에서 가장 좋은 곳의 등급)과 뜻이 다르므로 화면을 나눴다.
 * 고른 밤의 값은 이 장소의 이번 주 응답에서 가져온다. 처음 고른 밤은 목록에서 받은 값을 그대로 쓴다.
 */
export function PlaceView({ place, placeDate, dates, criteria, save, onBack }: PlaceViewProps) {
  const [date, setDate] = useState(placeDate)
  const week = useWeek({ lat: place.latitude, lon: place.longitude }, criteria)
  const weekPlace = week.week?.places[0]
  const levels = useMemo(() => {
    const map = new Map<string, RecommendationLevel>()
    for (const night of weekPlace?.nights ?? []) map.set(night.date, night.level)
    // 이번 주를 받기 전에도 처음 고른 밤의 등급은 안다
    if (!map.has(placeDate)) map.set(placeDate, place.level)
    return map
  }, [weekPlace, placeDate, place.level])
  const tonight = dates[0] ?? placeDate
  const night = date === placeDate ? null : weekPlace?.nights.find((item) => item.date === date)
  const shown = date === placeDate ? place : night && weekPlace ? onNight(place, weekPlace, night) : null

  return (
    <div className="place-view">
      <button type="button" className="back" onClick={onBack}>
        <ChevronIcon />
        목록
      </button>
      {dates.length > 0 ? (
        <NightPicker dates={dates} selected={date} onSelect={setDate} levels={levels} settled={week.status !== "loading"} />
      ) : null}
      {shown ? (
        <HeroCard
          key={`${place.latitude},${place.longitude},${date}`}
          place={shown}
          eyebrow={nightName(date, tonight)}
          nightLabel={nightName(date, tonight)}
          save={save}
        />
      ) : (
        <p className="calm">
          {week.status === "error"
            ? "이 밤의 예보를 받지 못했어요."
            : week.status === "ready"
              ? "이 밤은 예보가 아직 닿지 않아요."
              : "이 밤의 하늘을 살펴보는 중이에요."}
        </p>
      )}
    </div>
  )
}

/** 장소의 고정된 값(이름, 사진, 소개, 이동 시간)에 다른 밤의 값을 얹는다 */
function onNight(place: NightPlace, weekPlace: WeekPlace, night: WeekNight): NightPlace {
  return {
    ...place,
    level: night.level,
    pattern: night.pattern,
    notes: night.notes,
    bestWindow: night.bestWindow,
    moonBrightness: night.moonBrightness,
    moon: night.moon,
    hours: night.hours,
    forecastSource: weekPlace.forecastSource ?? place.forecastSource,
    forecastIssuedAt: weekPlace.forecastIssuedAt,
  }
}
