"use client"

import { authStore } from "@/lib/store/authStore"
import { weekdayOf } from "@/lib/tonight/time"
import type { NightPlace, NightQuery, NightRecommendation } from "@/lib/tonight/types"
import { useMyWeek } from "@/lib/tonight/use-week"
import { nightPlaceOf } from "@/lib/tonight/week"
import { levelStars, levelText } from "@/lib/tonight/wording"
import { BookmarkIcon, CloudIcon, StarIcon } from "./icons"
import { Rating } from "./rating"

interface MySectionProps {
  /** 지금 목록이 보여 주는 밤 */
  night: NightRecommendation
  criteria: Pick<NightQuery, "minClearHours" | "preferBefore">
  /** 내 장소가 바뀌면 늘린다. 이번 주를 다시 받는다 */
  revision: number
  onOpen: (place: NightPlace) => void
}

/**
 * 목록 맨 위의 내 장소. 줄마다 그 밤의 등급과 일곱 밤의 작은 띠를 보여 주고, 누르면 장소 화면이 열린다.
 * 로그인하지 않았거나 저장한 곳이 없으면 아무것도 그리지 않는다.
 */
export function MySection({ night, criteria, revision, onOpen }: MySectionProps) {
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const mine = useMyWeek(true, criteria, revision)
  const places = mine.week?.places ?? []
  if (!isAuthenticated || places.length === 0) return null
  const dates = mine.week?.dates ?? []

  return (
    <section className="sec my-section">
      <div className="sec-title">
        <h2>내 장소</h2>
      </div>
      <div className="my-rows">
        {places.map((place) => {
          const shown = nightPlaceOf(place, night)
          return (
            <button
              key={place.id ?? `${place.latitude},${place.longitude}`}
              type="button"
              className="my-row"
              onClick={() => onOpen(shown)}
            >
              <span className="my-name">
                <BookmarkIcon filled />
                {place.name ?? "저장한 장소"}
              </span>
              <Rating level={shown.level} compact />
              <span className="my-week" aria-hidden="true">
                {dates.map((date) => {
                  const level = place.nights.find((item) => item.date === date)?.level
                  return (
                    <i key={date} data-level={level ?? "NONE"} data-on={date === night.date ? "1" : undefined}>
                      <em>{weekdayOf(date)}</em>
                      {level ? levelStars(level) > 0 ? <StarIcon filled /> : <CloudIcon /> : "–"}
                    </i>
                  )
                })}
              </span>
              <span className="sr">
                {dates
                  .map((date) => {
                    const level = place.nights.find((item) => item.date === date)?.level
                    return `${weekdayOf(date)} ${level ? levelText(level) : "정보 없음"}`
                  })
                  .join(", ")}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
