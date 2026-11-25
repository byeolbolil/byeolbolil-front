"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useAuthInit } from "@/components/auth/AuthProvider"
import { useToast } from "@/hooks/use-toast"
import { bookmarksApi } from "@/lib/api/bookmarks"
import { authStore } from "@/lib/store/authStore"
import { buildNightView } from "@/lib/tonight/facts"
import type { PickedPlace } from "@/lib/tonight/geocode"
import { joinParts, placeKey, travelText } from "@/lib/tonight/place"
import { ORIGIN_NAME_MAX, originLabel, resolveOrigin, roundCoordinate, toNightQuery } from "@/lib/tonight/settings"
import { settingsOf, useSettings } from "@/lib/tonight/settings-store"
import { nightDates, nightName, windowText } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { useAreaName } from "@/lib/tonight/use-area-name"
import { useGeoPosition } from "@/lib/tonight/use-geo-position"
import { useIsDesktop } from "@/lib/tonight/use-is-desktop"
import { useNight } from "@/lib/tonight/use-night"
import { patternText } from "@/lib/tonight/wording"
import { AccountButton } from "./account-button"
import { DetailView } from "./detail-view"
import {
  BookmarkIcon,
  BrandMark,
  CalendarIcon,
  CameraIcon,
  ChevronIcon,
  CloseIcon,
  MapTabIcon,
  MineTabIcon,
  PinIcon,
  SettingsIcon,
  TonightTabIcon,
} from "./icons"
import { MapPanel } from "./map/map-panel"
import { MoreBlock } from "./more-block"
import { MyPlaces } from "./my-places"
import { NightPicker } from "./night-picker"
import { OriginSheet } from "./origin-sheet"
import { NightError, NightSkeleton } from "./night-status"
import { PlaceRow } from "./place-row"
import { Rating } from "./rating"
import { SavePlaceSheet } from "./save-place-sheet"
import { SettingsSheet } from "./settings-sheet"
import { Sheet } from "./sheet"
import { SourcesSheet } from "./sources-sheet"
import { TonightView } from "./tonight-view"
import { WeekOutlook, WeekSection } from "./week-outlook"
import "./tonight.css"

type SheetKind = "settings" | "origin" | "sources" | "save" | "week"
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
  /** 지도의 빈 곳을 누르거나 검색해서 고른 위치. 출발 위치로 삼거나 내 장소로 저장할 수 있다 */
  const [pick, setPick] = useState<PickedPlace | null>(null)
  // 현재 위치가 어디로 잡혔는지 이름으로 보여 준다. 추천 요청과 같이 1km로 줄인 좌표만 서버로 보낸다
  const gpsArea = useAreaName(
    settings.origin.kind === "gps" && geo.position
      ? { lat: roundCoordinate(geo.position.lat), lon: roundCoordinate(geo.position.lon) }
      : null,
  )
  /** 빈 곳을 눌러 고른 위치가 어느 지역인지 */
  const originText = originLabel(settings.origin, geo.position, gpsArea)
  const pickArea = useAreaName(pick?.source === "map" ? pick : null)
  const pickName = pick ? (pick.name ?? (pickArea ? `${pickArea} 근처` : "고른 위치")) : ""
  /** 자세히 보고 있는 장소의 키 */
  const [detailKey, setDetailKey] = useState<string | null>(null)
  /** 자세히 보고 있는 명소의 ID. 저장하거나 빼면 장소의 키가 바뀌므로(SPOT과 BOOKMARK) 명소 ID로도 찾는다 */
  const [detailSpotId, setDetailSpotId] = useState<number | null>(null)
  /** 저장하거나 빼는 중인 장소의 키. 추천을 다시 받을 때까지 버튼을 잠근다 */
  const [savingKey, setSavingKey] = useState<string | null>(null)
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
  const detailPlace =
    findPlace(detailKey) ??
    (detailKey !== null && detailSpotId !== null ? (places.find((place) => place.spotId === detailSpotId) ?? null) : null)
  /** 자세히 보고 있는 장소의 지금 키. 저장한 뒤에는 처음 연 키와 다르다 */
  const shownDetailKey = detailPlace ? placeKey(detailPlace) : null
  const peekPlace = findPlace(peekKey)
  // 추천을 다시 받았으면 저장 버튼을 푼다
  useEffect(() => {
    setSavingKey(null)
  }, [data])
  const topPlace = data ? buildNightView(data).top : null
  const topKey = topPlace ? placeKey(topPlace) : null
  const shownNightName = data && tonightDate ? nightName(data.date, tonightDate) : "오늘 밤"

  /**
   * 추천 목록이 스크롤되는 곳. 넓은 화면에서는 페이지를 고정하고 오른쪽 패널만 움직이고,
   * 좁은 화면에서는 페이지 전체가 움직인다.
   */
  const panelRef = useRef<HTMLElement>(null)
  const scrollPosition = () => (isDesktop ? (panelRef.current?.scrollTop ?? 0) : window.scrollY)
  const scrollPanelTo = (top: number, smooth = false) => {
    const target = isDesktop ? panelRef.current : window
    target?.scrollTo({ top, behavior: smooth ? "smooth" : "auto" })
  }
  /** 자세히 보기로 들어갈 때 목록이 스크롤돼 있던 위치. 돌아오면 그 자리를 다시 보여준다 */
  const listScroll = useRef<number | null>(null)
  const scrollToRestore = useRef<number | null>(null)
  const detailOpen = useRef(false)
  detailOpen.current = detailKey !== null

  /**
   * 자세히 보기를 연다. 처음 열 때 브라우저 기록을 하나 쌓아서, 휴대폰의 뒤로 가기가 사이트를 떠나지 않고
   * 목록으로 돌아오게 한다. 자세히 보기 안에서 다른 후보로 옮길 때는 기록을 더 쌓지 않는다.
   */
  const showDetail = (key: string) => {
    if (!detailOpen.current) {
      listScroll.current = scrollPosition()
      window.history.pushState({ ...window.history.state, bbDetail: true }, "")
    }
    setDetailKey(key)
    setDetailSpotId(findPlace(key)?.spotId ?? null)
    setMoreOpen(false)
  }
  /** 자세히 보기에서 나온다. `restore`면 목록에서 보던 자리로 돌아간다 */
  const leaveDetail = useCallback((restore: boolean) => {
    scrollToRestore.current = restore ? listScroll.current : null
    listScroll.current = null
    setDetailKey(null)
    setDetailSpotId(null)
    setMoreOpen(false)
  }, [])
  /** 탭이나 날짜를 바꾸면서 자세히 보기를 닫을 때. 쌓아 둔 기록도 함께 되돌린다 */
  const skipRestore = useRef(false)
  function closeDetail() {
    if (detailOpen.current && window.history.state?.bbDetail) {
      skipRestore.current = true
      window.history.back()
    }
    leaveDetail(false)
  }
  /** "돌아가기". 브라우저의 뒤로 가기와 같은 길을 탄다 */
  const backFromDetail = () => {
    if (window.history.state?.bbDetail) window.history.back()
    else leaveDetail(true)
  }
  useEffect(() => {
    const onPopState = () => {
      const restore = !skipRestore.current
      skipRestore.current = false
      if (detailOpen.current) leaveDetail(restore)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [leaveDetail])
  // 목록이 다시 그려진 직후, 화면에 보이기 전에 보던 자리로 옮긴다
  useLayoutEffect(() => {
    if (detailKey !== null || scrollToRestore.current === null) return
    const top = scrollToRestore.current
    scrollToRestore.current = null
    scrollPanelTo(top)
    // 스크롤할 곳은 화면 너비로만 정해지고, 돌아온 순간에만 옮기면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailKey])

  const selectDate = (date: string) => {
    setSelectedDate(date === tonightDate ? null : date)
    closeDetail()
  }
  const openPlace = (place: NightPlace) => {
    showDetail(placeKey(place))
    setPeekKey(null)
    scrollPanelTo(0, true)
  }
  /** 넓은 화면의 지도에서 표식을 누르면 오른쪽 패널에 그 장소를 연다 */
  const openFromMap = (key: string) => {
    setChosenTab("tonight")
    showDetail(key)
    setPick(null)
  }
  const peekOnMap = (key: string) => {
    setPeekKey(key)
    setPick(null)
  }
  const pickOnMap = (place: PickedPlace) => {
    setPick(place)
    setPeekKey(null)
  }
  /** 고른 위치를 출발 위치로 삼는다. 이동 시간을 여기서부터 다시 잰다 */
  const startFromPick = () => {
    if (!pick) return
    const name = (pick.name ?? pickArea ?? "고른 위치").slice(0, ORIGIN_NAME_MAX)
    settingsState.update({
      origin: { kind: "place", name, lat: roundPosition(pick.lat), lon: roundPosition(pick.lon) },
    })
    toast({ title: "출발 위치를 바꿨어요", description: `${name}에서 걸리는 시간으로 다시 추천해요.` })
    setPick(null)
  }

  /**
   * 추천 명소를 내 장소로 저장하거나, 저장해 둔 곳을 뺀다. 저장하면 다음 추천부터 내 장소로 나오고
   * 내 장소 탭에서 이번 주를 한꺼번에 볼 수 있다.
   */
  const toggleSaved = async (place: NightPlace) => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    setSavingKey(placeKey(place))
    try {
      if (place.type === "BOOKMARK") {
        await bookmarksApi.deleteBookmark(place.id)
        toast({ title: "내 장소에서 뺐어요", description: place.name })
        // 직접 고른 위치는 빼면 추천에서 사라진다. 보고 있던 화면을 닫는다
        if (place.spotId === undefined && detailOpen.current) backFromDetail()
      } else {
        await bookmarksApi.addBookmark({ type: "SPOT", spotId: place.spotId, name: place.name })
        toast({ title: "내 장소에 저장했어요", description: "내 장소 탭에서 이번 주를 한눈에 볼 수 있어요." })
      }
      night.reload()
    } catch {
      setSavingKey(null)
      toast({ title: "저장하지 못했어요", description: "잠시 뒤에 다시 시도해 주세요.", variant: "destructive" })
    }
  }
  /** 다른 화면에서 고른 밤의 추천 순위로 간다 */
  const openNight = (date: string) => {
    setSheet(null)
    setChosenTab("tonight")
    selectDate(date)
    scrollPanelTo(0)
  }
  const savePicked = async (name: string): Promise<boolean> => {
    if (!pick) return false
    try {
      await bookmarksApi.addBookmark({
        type: "CUSTOM",
        name,
        // 직접 고른 위치는 주소가 있어야 저장된다. 지역 이름을 모르면 좌표를 적는다
        address: pick.address || pickArea || `${pick.lat.toFixed(4)}, ${pick.lon.toFixed(4)}`,
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
    scrollPanelTo(0)
  }
  const addFromMap = () => {
    if (isDesktop) {
      toast({ title: "지도에서 찾거나 빈 곳을 눌러 보세요", description: "고른 위치를 내 장소로 저장할 수 있어요." })
    } else {
      selectTab("map")
    }
  }
  const openSettings = useCallback(() => setSheet("settings"), [])
  const openOrigin = useCallback(() => setSheet("origin"), [])
  const openSources = useCallback(() => setSheet("sources"), [])
  const closeSheet = useCallback(() => setSheet(null), [])

  /** 장소 카드에 붙이는 버튼과 자세히 보기 */
  const heroExtras = (place: NightPlace): { corner: ReactNode; actions: ReactNode; children: ReactNode } => {
    const open = detailed || moreOpen
    const saved = place.type === "BOOKMARK"
    const busy = savingKey === placeKey(place)
    const canSave = saved || place.spotId !== undefined
    return {
      // 저장은 카드 맨 위에서도 누를 수 있게 사진 위에 하나 더 둔다. 아래 버튼까지 내려가지 않아도 된다
      corner: canSave ? (
        <button
          type="button"
          className="save-pill"
          aria-pressed={saved}
          aria-label={saved ? "내 장소에 저장됨. 누르면 빼요" : "내 장소에 저장"}
          disabled={busy}
          onClick={() => void toggleSaved(place)}
        >
          <BookmarkIcon filled={saved} />
          {saved ? "저장됨" : "저장"}
        </button>
      ) : null,
      actions: (
        <>
          {canSave ? (
            <button
              type="button"
              className="btn save"
              aria-pressed={saved}
              disabled={busy}
              onClick={() => void toggleSaved(place)}
            >
              <BookmarkIcon filled={saved} />
              {busy ? (saved ? "빼는 중" : "저장하는 중") : saved ? "내 장소에 저장됨" : "내 장소에 저장"}
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
      children: (
        <>
          {open && data ? (
            <MoreBlock place={place} nightDate={data.date} criteria={data.criteria} onOpenSources={openSources} />
          ) : null}
          <WeekSection
            key={`${place.latitude},${place.longitude}`}
            position={{ lat: place.latitude, lon: place.longitude }}
            criteria={query}
            defaultOpen={detailPlace !== null}
            nightActions={(date) =>
              data && date !== data.date ? (
                <button type="button" className="btn" onClick={() => openNight(date)}>
                  이 밤의 추천 순위 보기
                </button>
              ) : null
            }
          />
        </>
      ),
    }
  }

  const pickCard = pick ? (
    <div className="peek pickcard">
      <div className="nm">{pickName}</div>
      <div className="sb">
        {joinParts([pick.address, `${pick.lat.toFixed(3)}, ${pick.lon.toFixed(3)}`])}
        <br />
        출발 위치로 삼거나, 저장해서 이곳의 밤도 함께 비교할 수 있어요
      </div>
      <div className="pick-actions">
        <button type="button" className="btn" onClick={startFromPick}>
          여기서 출발
        </button>
        {isAuthenticated ? (
          <button type="button" className="btn primary" onClick={() => setSheet("save")}>
            내 장소로 저장
          </button>
        ) : (
          <Link className="btn primary" href="/login">
            로그인하고 저장
          </Link>
        )}
        <button type="button" className="btn wide" onClick={() => setSheet("week")}>
          <CalendarIcon />
          이곳의 이번 주 보기
        </button>
      </div>
      <button type="button" className="x-btn" aria-label="고른 위치 지우기" onClick={() => setPick(null)}>
        <CloseIcon />
      </button>
    </div>
  ) : null

  const myPlaces = (
    <MyPlaces
      night={data}
      criteria={query}
      onOpenPlace={openPlace}
      onOpenNight={openNight}
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
            others={places.filter((place) => placeKey(place) !== shownDetailKey)}
            onOpenPlace={openPlace}
            onBack={backFromDetail}
            corner={extras.corner}
            actions={extras.actions}
          >
            {extras.children}
          </DetailView>
        ) : null}
        {tab === "map" ? (
          detailPlace ? null : (
            <>
              <div className="sec-title">
                <h2>지도에서 고르기</h2>
                <p>이름으로 찾거나 빈 곳을 눌러요</p>
              </div>
              <MapPanel
                places={places}
                selectedKey={peekKey}
                topKey={topKey}
                nightName={shownNightName}
                nightDate={data?.date ?? null}
                onSelect={peekOnMap}
                pick={pick}
                onPick={pickOnMap}
                origin={origin}
              >
                {pickCard}
                {peekPlace ? (
                  <div className="peek">
                    <div className="nm">
                      {peekPlace.name} <Rating level={peekPlace.level} compact />
                    </div>
                    <div className="sb">
                      {joinParts([
                        peekPlace.viewpoint,
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
          )
        ) : (
          // 자세히 보는 동안에도 목록을 지우지 않고 숨겨만 둔다. 펼쳐 둔 "더 보기"와 스크롤 자리가 돌아왔을 때 그대로다
          <div className="keep" hidden={detailPlace !== null}>
            <TonightView
              night={data}
              tonightDate={tonightDate}
              laterDates={laterDates}
              query={query}
              detailed={detailed}
              isAuthenticated={isAuthenticated}
              origin={origin}
              onOpenPlace={openPlace}
              onSelectDate={selectDate}
              onOpenSettings={openSettings}
              onOpenOrigin={openOrigin}
              // 숨겨 둔 동안에는 펼침 내용을 그리지 않는다. 자세히 보기의 것과 같은 그림이 두 벌 생긴다
              heroExtras={detailPlace ? undefined : heroExtras}
              footer={
                <p className="credit-line links">
                  <button type="button" className="linkish" onClick={openSources}>
                    추천 기준과 출처
                  </button>
                </p>
              }
            />
          </div>
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
        <button type="button" className="where" title="출발 위치 바꾸기" onClick={openOrigin}>
          <PinIcon />
          <span>{originText}</span>
        </button>
        <AccountButton pending={isInitializing} />
        {/* 좁은 화면에서는 아래 탭에 설정이 있다 */}
        <button type="button" className="gear only-d" aria-label="설정" onClick={openSettings}>
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
        <Link href="/guide">
          <CameraIcon className="ico" />
          촬영 가이드
        </Link>
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
              selectedKey={shownDetailKey ?? topKey}
              topKey={topKey}
              nightName={shownNightName}
              nightDate={data?.date ?? null}
              onSelect={openFromMap}
              pick={pick}
              onPick={pickOnMap}
              origin={origin}
            >
              {pickCard}
            </MapPanel>
          ) : null}
        </section>
        <main className="view" ref={panelRef}>
          {dates.length > 0 && shownDate && !detailPlace && tab === "tonight" ? (
            <NightPicker dates={dates} selected={shownDate} onSelect={selectDate} />
          ) : null}
          {content}
        </main>
      </div>
      {sheet === "settings" ? (
        <SettingsSheet
          settings={settings}
          originText={originText}
          hasOrigin={origin !== null}
          onChange={settingsState.update}
          onOpenOrigin={openOrigin}
          onOpenSources={openSources}
          onClose={closeSheet}
        />
      ) : null}
      {sheet === "origin" ? (
        <OriginSheet
          origin={settings.origin}
          geoStatus={geo.status}
          gpsArea={gpsArea}
          onChange={(next) => settingsState.update({ origin: next })}
          onClose={closeSheet}
        />
      ) : null}
      {sheet === "sources" ? <SourcesSheet onClose={closeSheet} /> : null}
      {sheet === "week" && pick ? (
        <Sheet title={`${pickName}의 이번 주`} onClose={closeSheet}>
          <WeekOutlook
            position={pick}
            criteria={query}
            nightActions={(date) => (
              <button type="button" className="btn" onClick={() => openNight(date)}>
                이 밤의 추천 순위 보기
              </button>
            )}
          />
        </Sheet>
      ) : null}
      {sheet === "save" && pick ? (
        <SavePlaceSheet
          position={pick}
          defaultName={pick.name}
          area={pick.address || pickArea}
          onSave={savePicked}
          onClose={closeSheet}
        />
      ) : null}
    </div>
  )
}
