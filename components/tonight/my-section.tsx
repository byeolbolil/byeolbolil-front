"use client"

import { useEffect, useState } from "react"
import { authStore } from "@/lib/store/authStore"
import { shortNightLabel, weekdayOf } from "@/lib/tonight/time"
import type { NightPlace, NightQuery, NightRecommendation } from "@/lib/tonight/types"
import { useMyWeek } from "@/lib/tonight/use-week"
import { nightPlaceOf } from "@/lib/tonight/week"
import { levelStars, levelText } from "@/lib/tonight/wording"
import { BookmarkIcon, ChevronIcon, CloudIcon, StarIcon } from "./icons"
import { Rating } from "./rating"

/** 북마크 묶음을 접어 둔 것을 다음 방문에도 기억한다 */
const FOLD_KEY = "bb.bookmarksFolded"

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
 * 로그인하지 않았거나 저장한 곳이 없으면 아무것도 그리지 않는다. 북마크가 많으면 아래 후보 목록이 밀려나서
 * 제목을 눌러 접을 수 있다.
 */
export function MySection({ night, criteria, revision, onOpen }: MySectionProps) {
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const mine = useMyWeek(true, criteria, revision)
  const [open, setOpen] = useState(true)
  useEffect(() => {
    try {
      if (window.localStorage.getItem(FOLD_KEY) === "1") setOpen(false)
    } catch {
      // 저장소를 쓸 수 없으면 늘 펼쳐 둔다
    }
  }, [])
  const toggle = () => {
    const next = !open
    setOpen(next)
    try {
      window.localStorage.setItem(FOLD_KEY, next ? "0" : "1")
    } catch {
      // 기억하지 못해도 이번에는 접힌다
    }
  }
  const places = mine.week?.places ?? []
  if (!isAuthenticated || places.length === 0) return null
  const dates = mine.week?.dates ?? []

  return (
    <section className="sec my-section">
      <div className="sec-title">
        <h2>
          <button type="button" className="fold-title" aria-expanded={open} onClick={toggle}>
            북마크
            {open ? null : <span className="count">{places.length}</span>}
            <ChevronIcon />
          </button>
        </h2>
      </div>
      {open ? (
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
                  {place.name ?? "북마크한 곳"}
                </span>
                <Rating level={shown.level} compact />
                <span className="my-week" aria-hidden="true">
                  {dates.map((date) => {
                    const level = place.nights.find((item) => item.date === date)?.level
                    return (
                      <i key={date} data-level={level ?? "NONE"} data-on={date === night.date ? "1" : undefined}>
                        <em>{shortNightLabel(date, dates[0] ?? date)}</em>
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
      ) : null}
    </section>
  )
}
