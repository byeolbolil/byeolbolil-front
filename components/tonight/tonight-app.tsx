"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useAuthInit } from "@/components/auth/AuthProvider"
import { authStore } from "@/lib/store/authStore"
import { placeKey } from "@/lib/tonight/place"
import { originLabel, resolveOrigin, toNightQuery } from "@/lib/tonight/settings"
import { settingsOf, useSettings } from "@/lib/tonight/settings-store"
import { nightDates, nightName } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { useGeoPosition } from "@/lib/tonight/use-geo-position"
import { useNight } from "@/lib/tonight/use-night"
import { DetailView } from "./detail-view"
import { BrandMark, ChevronIcon, SettingsIcon, TonightTabIcon } from "./icons"
import { MoreBlock } from "./more-block"
import { NightPicker } from "./night-picker"
import { NightError, NightSkeleton } from "./night-status"
import { SettingsSheet } from "./settings-sheet"
import { SourcesSheet } from "./sources-sheet"
import { TonightView } from "./tonight-view"
import "./tonight.css"

type SheetKind = "settings" | "sources"

/**
 * 메인 화면. 설정과 출발 위치를 읽어 오늘 밤 추천을 받고, 탭에 따라 화면을 바꾼다.
 */
export function TonightApp() {
  const settingsState = useSettings()
  const settings = useMemo(() => settingsOf(settingsState), [settingsState])
  const detailed = settings.viewMode === "detailed"
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const { isInitializing } = useAuthInit()
  // 저장된 토큰이 있으면 시작할 때의 재발급이 끝난 뒤에 추천을 받는다. 그래야 내 장소가 처음부터 들어간다.
  const hadToken = useRef<boolean | null>(null)
  if (hadToken.current === null) hadToken.current = authStore.getState().accessToken !== null

  useEffect(() => {
    void useSettings.persist.rehydrate()
  }, [])

  useEffect(() => {
    document.documentElement.dataset.red = settings.redScreen ? "1" : "0"
  }, [settings.redScreen])

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
  /** 자세히 보고 있는 장소의 키 */
  const [detailKey, setDetailKey] = useState<string | null>(null)
  /** 간단히 보기에서 "자세히"를 펼쳤는지 */
  const [moreOpen, setMoreOpen] = useState(false)
  const [sheet, setSheet] = useState<SheetKind | null>(null)

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
  const detailPlace = detailKey && data ? (data.places.find((place) => placeKey(place) === detailKey) ?? null) : null

  const selectDate = (date: string) => {
    setSelectedDate(date === tonightDate ? null : date)
    setDetailKey(null)
    setMoreOpen(false)
  }
  const openPlace = (place: NightPlace) => {
    setDetailKey(placeKey(place))
    setMoreOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const closeDetail = () => {
    setDetailKey(null)
    setMoreOpen(false)
  }
  const openSettings = useCallback(() => setSheet("settings"), [])
  const openSources = useCallback(() => setSheet("sources"), [])
  const closeSheet = useCallback(() => setSheet(null), [])

  /** 장소 카드에 붙이는 버튼과 자세히 보기 */
  const heroExtras = (place: NightPlace): { actions: ReactNode; children: ReactNode } => {
    const open = detailed || moreOpen
    return {
      actions: (
        <>
          <span className="spacer" />
          {detailed ? null : (
            <button type="button" className="btn ghost" aria-expanded={open} onClick={() => setMoreOpen((value) => !value)}>
              자세히 <ChevronIcon />
            </button>
          )}
        </>
      ),
      children:
        open && data ? (
          <MoreBlock place={place} nightDate={data.date} criteria={data.criteria} onOpenSources={openSources} />
        ) : null,
    }
  }

  let content: ReactNode
  if (night.error) {
    content = <NightError error={night.error} onRetry={night.reload} />
  } else if (data && tonightDate) {
    const extras = detailPlace ? heroExtras(detailPlace) : null
    content = (
      <div className={`view${night.loading ? " refreshing" : ""}`} aria-busy={night.loading}>
        {detailPlace && extras ? (
          <DetailView
            place={detailPlace}
            nightName={nightName(data.date, tonightDate)}
            detailed={detailed}
            onBack={closeDetail}
            actions={extras.actions}
          >
            {extras.children}
          </DetailView>
        ) : (
          <TonightView
            night={data}
            tonightDate={tonightDate}
            laterDates={laterDates}
            query={query}
            detailed={detailed}
            isAuthenticated={isAuthenticated}
            hasOrigin={origin !== null}
            onOpenPlace={openPlace}
            onSelectDate={selectDate}
            onOpenSettings={openSettings}
            heroExtras={heroExtras}
            footer={
              <button type="button" className="linkish" style={{ alignSelf: "flex-start" }} onClick={openSources}>
                추천 기준과 출처
              </button>
            }
          />
        )}
      </div>
    )
  } else {
    content = <NightSkeleton />
  }

  return (
    <div className="bb">
      <header className="top">
        <div className="brand">
          <BrandMark />
          별볼일
        </div>
        <button type="button" className="where" title="출발 위치" onClick={openSettings}>
          {originLabel(settings.origin, geo.position)}
        </button>
        <button type="button" className="gear" aria-label="설정" onClick={openSettings}>
          <SettingsIcon />
        </button>
      </header>
      <nav className="nav" role="tablist" aria-label="화면">
        <button type="button" role="tab" aria-selected="true" onClick={closeDetail}>
          <TonightTabIcon />
          오늘 밤
        </button>
        <button type="button" className="only-m" onClick={openSettings}>
          <SettingsIcon className="ico" />
          설정
        </button>
      </nav>
      <div className="stage">
        <section className="mapcol" aria-label="지도" />
        <main className="view">
          {dates.length > 0 && shownDate && !detailPlace ? (
            <NightPicker dates={dates} selected={shownDate} onSelect={selectDate} />
          ) : null}
          {content}
        </main>
      </div>
      {sheet === "settings" ? (
        <SettingsSheet
          settings={settings}
          geoStatus={geo.status}
          hasOrigin={origin !== null}
          onChange={settingsState.update}
          onOpenSources={openSources}
          onClose={closeSheet}
        />
      ) : null}
      {sheet === "sources" ? <SourcesSheet onClose={closeSheet} /> : null}
    </div>
  )
}
