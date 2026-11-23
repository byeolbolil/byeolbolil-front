"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAuthInit } from "@/components/auth/AuthProvider"
import { authStore } from "@/lib/store/authStore"
import { resolveOrigin, toNightQuery } from "@/lib/tonight/settings"
import { settingsOf, useSettings } from "@/lib/tonight/settings-store"
import { nightDates } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { useGeoPosition } from "@/lib/tonight/use-geo-position"
import { useNight } from "@/lib/tonight/use-night"
import { BrandMark, TonightTabIcon } from "./icons"
import { NightPicker } from "./night-picker"
import { NightError, NightSkeleton } from "./night-status"
import { TonightView } from "./tonight-view"
import "./tonight.css"

/**
 * 메인 화면. 설정과 출발 위치를 읽어 오늘 밤 추천을 받고, 탭에 따라 화면을 바꾼다.
 */
export function TonightApp() {
  const settingsState = useSettings()
  const settings = useMemo(() => settingsOf(settingsState), [settingsState])
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const { isInitializing } = useAuthInit()
  // 저장된 토큰이 있으면 시작할 때의 재발급이 끝난 뒤에 추천을 받는다. 그래야 내 장소가 처음부터 들어간다.
  const hadToken = useRef<boolean | null>(null)
  if (hadToken.current === null) hadToken.current = authStore.getState().accessToken !== null

  useEffect(() => {
    void useSettings.persist.rehydrate()
  }, [])

  const geo = useGeoPosition(settingsState.hydrated && settings.origin.kind === "gps")
  const origin = resolveOrigin(settings.origin, geo.position)
  const originLat = origin?.lat ?? null
  const originLon = origin?.lon ?? null
  const query = useMemo(
    () => toNightQuery(settings, originLat !== null && originLon !== null ? { lat: originLat, lon: originLon } : null),
    [settings, originLat, originLon],
  )

  /** 고른 밤. null이면 오늘 밤이다 */
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  /** 오늘 밤의 날짜. 서버가 정한다(새벽 4시 전에는 전날). 오늘 밤 추천을 처음 받을 때 알게 된다 */
  const [knownTonight, setKnownTonight] = useState<string | null>(null)

  const locating = geo.status === "checking" || geo.status === "locating"
  const ready = settingsState.hydrated && !locating && (!hadToken.current || !isInitializing)
  const night = useNight(selectedDate, query, ready)
  const data = night.data

  const tonightDate = knownTonight ?? (selectedDate === null && data ? data.date : null)
  useEffect(() => {
    if (tonightDate && tonightDate !== knownTonight) setKnownTonight(tonightDate)
  }, [tonightDate, knownTonight])

  const dates = useMemo(() => (tonightDate ? nightDates(tonightDate) : []), [tonightDate])
  const shownDate = selectedDate ?? tonightDate
  const laterDates = data ? dates.filter((date) => date > data.date) : []

  const selectDate = (date: string) => setSelectedDate(date === tonightDate ? null : date)
  const openPlace = (_place: NightPlace) => {}

  return (
    <div className="bb">
      <header className="top">
        <div className="brand">
          <BrandMark />
          별볼일
        </div>
      </header>
      <nav className="nav" role="tablist" aria-label="화면">
        <button type="button" role="tab" aria-selected="true">
          <TonightTabIcon />
          오늘 밤
        </button>
      </nav>
      <div className="stage">
        <section className="mapcol" aria-label="지도" />
        <main className="view">
          {dates.length > 0 && shownDate ? <NightPicker dates={dates} selected={shownDate} onSelect={selectDate} /> : null}
          {night.error ? (
            <NightError error={night.error} onRetry={night.reload} />
          ) : data && tonightDate ? (
            <div className={`view${night.loading ? " refreshing" : ""}`} aria-busy={night.loading}>
              <TonightView
                night={data}
                tonightDate={tonightDate}
                laterDates={laterDates}
                query={query}
                detailed={settings.viewMode === "detailed"}
                isAuthenticated={isAuthenticated}
                hasOrigin={origin !== null}
                onOpenPlace={openPlace}
                onSelectDate={selectDate}
              />
            </div>
          ) : (
            <NightSkeleton />
          )}
        </main>
      </div>
    </div>
  )
}
