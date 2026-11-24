"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useAuthInit } from "@/components/auth/AuthProvider"
import { useToast } from "@/hooks/use-toast"
import { bookmarksApi } from "@/lib/api/bookmarks"
import { authStore } from "@/lib/store/authStore"
import { buildNightView } from "@/lib/tonight/facts"
import { joinParts, placeKey, travelText } from "@/lib/tonight/place"
import { originLabel, resolveOrigin, toNightQuery, type Coordinates } from "@/lib/tonight/settings"
import { settingsOf, useSettings } from "@/lib/tonight/settings-store"
import { nightDates, nightName, windowText } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { useGeoPosition } from "@/lib/tonight/use-geo-position"
import { useIsDesktop } from "@/lib/tonight/use-is-desktop"
import { useNight } from "@/lib/tonight/use-night"
import { patternText } from "@/lib/tonight/wording"
import { DetailView } from "./detail-view"
import { BrandMark, ChevronIcon, CloseIcon, MapTabIcon, MineTabIcon, SettingsIcon, TonightTabIcon } from "./icons"
import { MapPanel } from "./map/map-panel"
import { MoreBlock } from "./more-block"
import { MyPlaces } from "./my-places"
import { NightPicker } from "./night-picker"
import { NightError, NightSkeleton } from "./night-status"
import { PlaceRow } from "./place-row"
import { Rating } from "./rating"
import { SavePlaceSheet } from "./save-place-sheet"
import { SettingsSheet } from "./settings-sheet"
import { SourcesSheet } from "./sources-sheet"
import { TonightView } from "./tonight-view"
import "./tonight.css"

type SheetKind = "settings" | "sources" | "save"
type Tab = "tonight" | "map" | "mine"

/** 저장하는 좌표의 자릿수. 소수 다섯째 자리는 약 1m다 */
const roundPosition = (value: number) => Math.round(value * 1e5) / 1e5

/**
 * 메인 화면. 설정과 출발 위치를 읽어 오늘 밤 추천을 받고, 탭에 따라 화면을 바꾼다.
 */
export function TonightApp() {
  const settingsState = useSettings()
  const settings = useMemo(() => settingsOf(settingsState), [settingsState])
  const detailed = settings.viewMode === "detailed"
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const { isInitializing } = useAuthInit()
  const { toast } = useToast()
  const router = useRouter()
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
  const isDesktop = useIsDesktop()
  const [chosenTab, setChosenTab] = useState<Tab>("tonight")
  // 넓은 화면에서는 지도가 늘 왼쪽에 있어서 지도 탭이 없다
  const tab: Tab = isDesktop && chosenTab === "map" ? "tonight" : chosenTab
  /** 모바일 지도에서 누른 표식의 장소 */
  const [peekKey, setPeekKey] = useState<string | null>(null)
  /** 지도의 빈 곳을 눌러 고른 위치. 내 장소로 저장할 수 있다 */
  const [pick, setPick] = useState<Coordinates | null>(null)
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
  const places = data?.places ?? []
  const findPlace = (key: string | null) => (key ? (places.find((place) => placeKey(place) === key) ?? null) : null)
  const detailPlace = findPlace(detailKey)
  const peekPlace = findPlace(peekKey)
  const topPlace = data ? buildNightView(data).top : null
  const topKey = topPlace ? placeKey(topPlace) : null
  const shownNightName = data && tonightDate ? nightName(data.date, tonightDate) : "오늘 밤"

  const selectDate = (date: string) => {
    setSelectedDate(date === tonightDate ? null : date)
    setDetailKey(null)
    setMoreOpen(false)
  }
  const openPlace = (place: NightPlace) => {
    setDetailKey(placeKey(place))
    setPeekKey(null)
    setMoreOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  /** 넓은 화면의 지도에서 표식을 누르면 오른쪽 패널에 그 장소를 연다 */
  const openFromMap = (key: string) => {
    setChosenTab("tonight")
    setDetailKey(key)
    setPick(null)
    setMoreOpen(false)
  }
  const peekOnMap = (key: string) => {
    setPeekKey(key)
    setPick(null)
  }
  const pickOnMap = (position: Coordinates) => {
    setPick(position)
    setPeekKey(null)
  }

  /** 추천 명소를 내 장소로 저장한다. 저장하면 다음 추천부터 내 장소로 나온다 */
  const saveSpot = async (place: NightPlace) => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    try {
      await bookmarksApi.addBookmark({ type: "SPOT", spotId: place.spotId, name: place.name })
      toast({ title: "내 장소에 저장했어요", description: place.name })
      night.reload()
    } catch {
      toast({ title: "저장하지 못했어요", description: "잠시 뒤에 다시 시도해 주세요.", variant: "destructive" })
    }
  }
  const savePicked = async (name: string): Promise<boolean> => {
    if (!pick) return false
    try {
      await bookmarksApi.addBookmark({
        type: "CUSTOM",
        name,
        latitude: roundPosition(pick.lat),
        longitude: roundPosition(pick.lon),
      })
      toast({ title: "내 장소에 저장했어요", description: name })
      setPick(null)
      night.reload()
      return true
    } catch {
      toast({ title: "저장하지 못했어요", description: "잠시 뒤에 다시 시도해 주세요.", variant: "destructive" })
      return false
    }
  }
  const selectTab = (next: Tab) => {
    setChosenTab(next)
    closeDetail()
    // 이전 탭에서 내려 둔 스크롤이 남으면 새 화면의 중간부터 보인다
    window.scrollTo({ top: 0 })
  }
  const addFromMap = () => {
    if (isDesktop) {
      toast({ title: "지도에서 빈 곳을 눌러 보세요", description: "고른 위치를 내 장소로 저장할 수 있어요." })
    } else {
      selectTab("map")
    }
  }
  function closeDetail() {
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
          {place.type === "SPOT" && place.spotId !== undefined ? (
            <button type="button" className="btn" onClick={() => void saveSpot(place)}>
              저장
            </button>
          ) : null}
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

  const pickCard = pick ? (
    <div className="peek pickcard">
      <div className="nm">고른 위치</div>
      <div className="sb">
        {pick.lat.toFixed(3)}, {pick.lon.toFixed(3)} · 저장하면 이곳의 밤도 함께 비교해 드려요
      </div>
      {isAuthenticated ? (
        <button type="button" className="btn primary" onClick={() => setSheet("save")}>
          내 장소로 저장
        </button>
      ) : (
        <Link className="btn primary" href="/login">
          로그인하고 저장
        </Link>
      )}
      <button type="button" className="x-btn" aria-label="고른 위치 지우기" onClick={() => setPick(null)}>
        <CloseIcon />
      </button>
    </div>
  ) : null

  const myPlaces = (
    <MyPlaces
      night={data}
      nightName={shownNightName}
      detailed={detailed}
      onOpenPlace={openPlace}
      onAddFromMap={addFromMap}
      onChanged={night.reload}
    />
  )

  let content: ReactNode
  if (tab === "mine" && !detailPlace) {
    content = myPlaces
  } else if (night.error) {
    content = <NightError error={night.error} onRetry={night.reload} />
  } else if (data && tonightDate) {
    const extras = detailPlace ? heroExtras(detailPlace) : null
    content = (
      <div className={`view${night.loading ? " refreshing" : ""}`} aria-busy={night.loading}>
        {detailPlace && extras ? (
          <DetailView
            place={detailPlace}
            nightName={shownNightName}
            detailed={detailed}
            onBack={closeDetail}
            actions={extras.actions}
          >
            {extras.children}
          </DetailView>
        ) : tab === "map" ? (
          <>
            <div className="sec-title">
              <h2>지도에서 고르기</h2>
              <p>빈 곳을 누르면 그 위치를 골라요</p>
            </div>
            <MapPanel
              places={places}
              selectedKey={peekKey}
              topKey={topKey}
              nightName={shownNightName}
              onSelect={peekOnMap}
              pick={pick}
              onPick={pickOnMap}
            >
              {pickCard}
              {peekPlace ? (
                <div className="peek">
                  <div className="nm">
                    {peekPlace.name} <Rating level={peekPlace.level} compact />
                  </div>
                  <div className="sb">
                    {joinParts([
                      peekPlace.bestWindow ? windowText(peekPlace.bestWindow) : patternText(peekPlace.pattern),
                      travelText(peekPlace.travel),
                    ])}
                  </div>
                  <button type="button" className="btn primary" onClick={() => openPlace(peekPlace)}>
                    자세히
                  </button>
                </div>
              ) : null}
            </MapPanel>
            <section className="sec">
              <div className="sec-title">
                <h2>지도 속 장소</h2>
                <p>{shownNightName} 기준</p>
              </div>
              <div className="rows">
                {places.map((place) => (
                  <PlaceRow
                    key={placeKey(place)}
                    place={place}
                    detailed={detailed}
                    selected={placeKey(place) === peekKey}
                    onOpen={openPlace}
                  />
                ))}
              </div>
            </section>
          </>
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
              <p className="credit-line links">
                <button type="button" className="linkish" onClick={openSources}>
                  추천 기준과 출처
                </button>
                <Link href="/guide">별 사진 촬영 가이드</Link>
              </p>
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
        <button type="button" role="tab" aria-selected={tab === "tonight"} onClick={() => selectTab("tonight")}>
          <TonightTabIcon />
          오늘 밤
        </button>
        <button type="button" role="tab" className="only-m" aria-selected={tab === "map"} onClick={() => selectTab("map")}>
          <MapTabIcon />
          지도
        </button>
        <button type="button" role="tab" aria-selected={tab === "mine"} onClick={() => selectTab("mine")}>
          <MineTabIcon />
          내 장소
        </button>
        <button type="button" className="only-m" onClick={openSettings}>
          <SettingsIcon className="ico" />
          설정
        </button>
      </nav>
      <div className="stage">
        <section className="mapcol" aria-label="지도">
          {isDesktop ? (
            <MapPanel
              places={places}
              selectedKey={detailKey ?? topKey}
              topKey={topKey}
              nightName={shownNightName}
              onSelect={openFromMap}
              pick={pick}
              onPick={pickOnMap}
            >
              {pickCard}
            </MapPanel>
          ) : null}
        </section>
        <main className="view">
          {dates.length > 0 && shownDate && !detailPlace && tab === "tonight" ? (
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
      {sheet === "save" && pick ? <SavePlaceSheet position={pick} onSave={savePicked} onClose={closeSheet} /> : null}
    </div>
  )
}
