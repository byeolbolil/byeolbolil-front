"use client"

import { useMemo, useState, type ReactNode } from "react"
import { nightName } from "@/lib/tonight/time"
import type { NightPlace, NightQuery, RecommendationLevel } from "@/lib/tonight/types"
import { useWeek } from "@/lib/tonight/use-week"
import { placeOnNight } from "@/lib/tonight/week"
import { HeroCard } from "./hero-card"
import { NightPicker } from "./night-picker"

interface PlaceViewProps {
  /** 목록이나 지도에서 고른 장소. `placeDate` 밤의 값이 들어 있다 */
  place: NightPlace
  /** `place`가 담고 있는 밤의 날짜. 처음에는 이 밤을 보여 준다 */
  placeDate: string
  /** 오늘 밤부터 7일 */
  dates: readonly string[]
  criteria: Pick<NightQuery, "minClearHours" | "preferBefore">
  /** 북마크 버튼 */
  save?: ReactNode
}

/**
 * 장소 하나의 화면. 첫 화면은 그 밤의 1위 장소이고, 목록에서 다른 곳을 누르면 그 자리에서 장소만 바뀐다.
 * 위의 날짜 칸은 이 장소의 일곱 밤이고, 날짜를 눌러도 장소는 그대로다. 후보 목록의 밤은 목록 위의 같은 모양 날짜 칸으로
 * 고르므로, 두 줄은 각자 위의 제목("○○의 이번 주", "○요일 밤 후보")으로 구분한다.
 * 고른 밤의 값은 이 장소의 이번 주 응답에서 가져온다. 처음 고른 밤은 목록에서 받은 값을 그대로 쓴다.
 */
export function PlaceView({ place, placeDate, dates, criteria, save }: PlaceViewProps) {
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
  const shown = date === placeDate ? place : night && weekPlace ? placeOnNight(place, weekPlace, night) : null

  return (
    <div className="place-view">
      {/* 옆 칸의 "그 밤 후보" 제목과 같은 모양으로, 아래 날짜 줄이 이 장소의 일곱 밤이라는 것을 이름으로 알린다 */}
      <div className="sec-title">
        <h2>{place.name}의 이번 주</h2>
      </div>
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
