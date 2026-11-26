"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useAuthInit } from "@/components/auth/AuthProvider"
import { useToast } from "@/hooks/use-toast"
import { bookmarksApi } from "@/lib/api/bookmarks"
import { authStore } from "@/lib/store/authStore"
import { buildNightView, nightGoodCounts, nightLevels } from "@/lib/tonight/facts"
import type { PickedPlace } from "@/lib/tonight/geocode"
import { joinParts, placeKey, travelText } from "@/lib/tonight/place"
import { ORIGIN_NAME_MAX, originLabel, resolveOrigin, roundCoordinate, toNightQuery, type Coordinates } from "@/lib/tonight/settings"
import { settingsOf, useSettings } from "@/lib/tonight/settings-store"
import { nightDates, nightName, windowText } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { useAreaName } from "@/lib/tonight/use-area-name"
import { useSkyAt } from "@/lib/tonight/use-sky-at"
import { useGeoPosition } from "@/lib/tonight/use-geo-position"
import { useIsDesktop, useIsWide } from "@/lib/tonight/use-is-desktop"
import { useNight, useNightSummary } from "@/lib/tonight/use-night"
import { patternText } from "@/lib/tonight/wording"
import { AccountButton } from "./account-button"
import {
  BookmarkIcon,
  BrandMark,
  CalendarIcon,
  CameraIcon,
  ChevronIcon,
  CloseIcon,
  MapTabIcon,
  PinIcon,
  SettingsIcon,
  TonightTabIcon,
} from "./icons"
import { MapPanel } from "./map/map-panel"
import { MySection } from "./my-section"
import { NightPicker } from "./night-picker"
import { OriginSheet } from "./origin-sheet"
import { NightError, NightSkeleton } from "./night-status"
import { GuideSheet } from "./guide-sheet"
import { LoginSheet } from "./login-sheet"
import { PickSky } from "./pick-sky"
import { PlaceView } from "./place-view"
import { PlaceRow } from "./place-row"
import { Rating } from "./rating"
import { SavePlaceSheet } from "./save-place-sheet"
import { SettingsSheet } from "./settings-sheet"
import { Sheet } from "./sheet"
import { SourcesSheet } from "./sources-sheet"
import { NightCandidates, NightCard, type CardExtras } from "./tonight-view"
import { WeekOutlook } from "./week-outlook"
import "./tonight.css"

type SheetKind = "settings" | "origin" | "sources" | "save" | "week" | "login" | "guide"

/** 로그인 창을 열 때 하려던 일. 로그인하면 이어서 한다 */
type AfterLogin = { kind: "saveSpot"; spotId: number; name: string } | { kind: "savePick" } | { kind: "none" }

/**
 * 소셜 로그인으로 페이지를 떠났다 돌아올 때 이어 갈 것. 떠나기 직전에 sessionStorage에 남기고, 돌아와서 한 번 읽고 지운다.
 * 보던 탭과 밤, 카드에 띄운 장소, 지도에서 고른 위치와 하려던 일이다.
 */
const RESUME_KEY = "bb.resumeAfterLogin"
interface Resume {
  tab: Tab
  date: string | null
  detailKey: string | null
  detailSpotId: number | null
  pick: PickedPlace | null
  after: AfterLogin | null
}
/** 좁은 화면에서 목록과 지도 가운데 무엇을 보는지. 넓은 화면에서는 지도가 늘 왼쪽에 있어 늘 목록이다 */
type Tab = "tonight" | "map"

/** 저장하는 좌표의 자릿수. 소수 다섯째 자리는 약 1m다 */
const roundPosition = (value: number) => Math.round(value * 1e5) / 1e5

/**
 * 메인 화면. 설정과 출발 위치를 읽어 오늘 밤 추천을 받고, 탭에 따라 화면을 바꾼다.
 */
export function TonightApp() {
  const settingsState = useSettings()
  const settings = useMemo(() => settingsOf(settingsState), [settingsState])
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const { isInitializing } = useAuthInit()
  const { toast } = useToast()
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
  /** 후보 목록이 장소 카드 옆에 제 칸을 가지는 너비인지 */
  const isWide = useIsWide()
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
  const pickSky = useSkyAt(pick)
  /** 목록이나 지도에서 골라 카드에 띄운 장소의 키. null이면 그 밤에 가장 좋은 곳을 보여준다 */
  const [detailKey, setDetailKey] = useState<string | null>(null)
  /** 고른 명소의 ID. 저장하거나 빼면 장소의 키가 바뀌므로(SPOT과 BOOKMARK) 명소 ID로도 찾는다 */
  const [detailSpotId, setDetailSpotId] = useState<number | null>(null)
  /** 장소 화면에 띄운 장소를 열 때의 값. 그 밤의 추천에 없는 내 장소(이동 시간 한도 밖)도 열 수 있게 들고 있는다 */
  const [detailSnapshot, setDetailSnapshot] = useState<NightPlace | null>(null)
  /** 넓은 화면의 지도를 옮겨 보여 줄 곳. 목록에서 장소를 누르면 그쪽으로 간다 */
  const [mapFocus, setMapFocus] = useState<(Coordinates & { at: number }) | null>(null)
  /** 내 장소가 바뀐 횟수. 목록의 내 장소 묶음이 이번 주를 다시 받는다 */
  const [myRevision, setMyRevision] = useState(0)
  /** 저장하거나 빼는 중인 장소의 키. 추천을 다시 받을 때까지 버튼을 잠근다 */
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  /** 로그인 창을 열면서 미뤄 둔 일 */
  const [afterLogin, setAfterLogin] = useState<AfterLogin | null>(null)
  /** 소셜 로그인에서 돌아와 아직 하지 못한 일. 로그인 확인이 끝나면 한다 */
  const [resumed, setResumed] = useState<AfterLogin | null>(null)
  // 소셜 로그인에서 돌아왔으면 떠나기 전의 화면으로 되돌린다
  useEffect(() => {
    let saved: Resume | null = null
    try {
      const raw = window.sessionStorage.getItem(RESUME_KEY)
      window.sessionStorage.removeItem(RESUME_KEY)
      saved = raw ? (JSON.parse(raw) as Resume) : null
    } catch {
      saved = null
    }
    if (!saved) return
    setChosenTab(saved.tab === "map" ? "map" : "tonight")
    setSelectedDate(saved.date)
    setDetailKey(saved.detailKey)
    setDetailSpotId(saved.detailSpotId)
    setPick(saved.pick)
    setResumed(saved.after ?? { kind: "none" })
  }, [])

  const locating = geo.status === "checking" || geo.status === "locating"
  const ready = settingsState.hydrated && !locating && (!hadToken.current || !isInitializing)
  const night = useNight(selectedDate, query, ready)
  const data = night.data
  // 밤 고르기에 그릴 밤마다의 등급. 추천과 따로 받아서, 늦게 오거나 받지 못해도 추천을 막지 않는다
  const nightSummary = useNightSummary(query, ready)
  const levels = useMemo(
    () => nightLevels(nightSummary.summary, night.stale ? null : data),
    [nightSummary.summary, night.stale, data],
  )
  const goodCounts = useMemo(
    () => nightGoodCounts(nightSummary.summary, night.stale ? null : data),
    [nightSummary.summary, night.stale, data],
  )
  /** 내 장소가 바뀌면 후보가 달라지므로 추천과 밤마다의 등급을 함께 다시 받는다 */
  const reloadNights = () => {
    night.reload()
    nightSummary.reload()
    setMyRevision((value) => value + 1)
  }

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
    (detailKey !== null && detailSpotId !== null ? (places.find((place) => place.spotId === detailSpotId) ?? null) : null) ??
    (detailKey !== null && detailSnapshot && placeKey(detailSnapshot) === detailKey ? detailSnapshot : null)
  const peekPlace = findPlace(peekKey)
  // 추천을 다시 받았으면 저장 버튼을 푼다
  useEffect(() => {
    setSavingKey(null)
  }, [data])
  const topPlace = data ? buildNightView(data).top : null
  const topKey = topPlace ? placeKey(topPlace) : null
  /** 카드에 떠 있는 장소의 키. 고른 곳이 없으면 가장 좋은 곳이다. 저장한 뒤에는 처음 고른 키와 다르다 */
  const shownKey = detailPlace ? placeKey(detailPlace) : topKey
  const shownNightName = data && tonightDate ? nightName(data.date, tonightDate) : "오늘 밤"

  /**
   * 장소 카드가 스크롤되는 곳. 좁은 화면에서는 페이지 전체가 움직이고, PC에서는 페이지를 고정한 채 오른쪽 패널이,
   * 패널이 카드와 목록 두 칸으로 나뉘는 넓은 화면에서는 카드의 칸이 움직인다.
   */
  const panelRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const scroller = () => (isWide ? cardRef.current : panelRef.current)
  const scrollPosition = () => (isDesktop ? (scroller()?.scrollTop ?? 0) : window.scrollY)
  const scrollPanelTo = (top: number, smooth = false) => {
    const target = isDesktop ? scroller() : window
    target?.scrollTo({ top, behavior: smooth ? "smooth" : "auto" })
  }
  /** 장소를 고를 때 화면이 스크롤돼 있던 위치와 보고 있던 탭. 뒤로 가면 그 자리를 다시 보여준다 */
  const listScroll = useRef<number | null>(null)
  const cameFrom = useRef<Tab | null>(null)
  const scrollToRestore = useRef<number | null>(null)
  const detailOpen = useRef(false)
  detailOpen.current = detailKey !== null

  /**
   * 장소를 골라 카드에 띄운다. 화면에는 돌아가는 버튼이 없지만 처음 고를 때 브라우저 기록을 하나 쌓아서,
   * 휴대폰의 뒤로 가기가 사이트를 떠나지 않고 고르기 전으로 돌아오게 한다. 이어서 다른 곳을 고를 때는 더 쌓지 않는다.
   */
  const showDetail = (key: string) => {
    if (!detailOpen.current) {
      listScroll.current = scrollPosition()
      cameFrom.current = tab
      window.history.pushState({ ...window.history.state, bbDetail: true }, "")
    }
    setDetailKey(key)
    setDetailSpotId(findPlace(key)?.spotId ?? null)
  }
  /** 고른 장소를 풀고 가장 좋은 곳으로 돌아간다. `restore`면 고르기 전에 보던 탭과 자리로 돌아간다 */
  const leaveDetail = useCallback((restore: boolean) => {
    scrollToRestore.current = restore ? listScroll.current : null
    if (restore && cameFrom.current) setChosenTab(cameFrom.current)
    listScroll.current = null
    cameFrom.current = null
    setDetailKey(null)
    setDetailSpotId(null)
    setDetailSnapshot(null)
  }, [])
  /** 탭이나 날짜를 바꾸면서 고른 장소를 풀 때. 쌓아 둔 기록도 함께 되돌린다 */
  const skipRestore = useRef(false)
  function closeDetail() {
    if (detailOpen.current && window.history.state?.bbDetail) {
      skipRestore.current = true
      window.history.back()
    }
    leaveDetail(false)
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
  // 화면이 다시 그려진 직후, 눈에 보이기 전에 보던 자리로 옮긴다
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
  /** 장소 화면에 그 장소를 띄운다. 그 밤의 1위를 다시 누르면 고르기 전으로 돌아간다. 뒤로 가면 보던 자리로 돌아온다 */
  const selectPlace = (key: string) => {
    if (key === topKey) closeDetail()
    else showDetail(key)
    scrollPanelTo(0, true)
  }
  const openPlace = (place: NightPlace) => {
    setDetailSnapshot(place)
    selectPlace(placeKey(place))
    setPeekKey(null)
    // 좁은 화면의 지도에서 열면 장소 화면이 있는 목록으로 넘어간다. 뒤로 가면 지도로 돌아온다
    if (tab === "map") setChosenTab("tonight")
    // 다른 지역을 보고 있었어도 지도가 그 장소로 옮겨 간다
    setMapFocus({ lat: place.latitude, lon: place.longitude, at: Date.now() })
  }
  /** PC의 지도에서 표식을 누르면 오른쪽의 카드에 그 장소를 띄운다 */
  const openFromMap = (key: string) => {
    selectPlace(key)
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
      if (place.spotId !== undefined) askLogin({ kind: "saveSpot", spotId: place.spotId, name: place.name })
      return
    }
    setSavingKey(placeKey(place))
    try {
      if (place.type === "BOOKMARK") {
        await bookmarksApi.deleteBookmark(place.id)
        toast({ title: "북마크에서 뺐어요", description: place.name })
        // 직접 고른 위치는 빼면 추천에서 사라진다. 카드를 가장 좋은 곳으로 돌린다
        if (place.spotId === undefined) closeDetail()
      } else {
        await bookmarksApi.addBookmark({ type: "SPOT", spotId: place.spotId, name: place.name })
        toast({ title: "북마크했어요", description: place.name })
      }
      reloadNights()
    } catch {
      setSavingKey(null)
      toast({ title: "저장하지 못했어요", description: "잠시 뒤에 다시 시도해 주세요.", variant: "destructive" })
    }
  }
  /** 다른 페이지로 옮기지 않고 로그인 창을 띄운다. 로그인하면 `after`를 이어서 한다 */
  const askLogin = (after: AfterLogin) => {
    setAfterLogin(after)
    setSheet("login")
  }
  /** 로그인한 뒤에 미뤄 둔 일을 한다. 내 장소가 추천에 들어오도록 추천은 늘 다시 받는다 */
  const continueAfterLogin = async (after: AfterLogin | null) => {
    if (after?.kind === "saveSpot") {
      try {
        await bookmarksApi.addBookmark({ type: "SPOT", spotId: after.spotId, name: after.name })
        toast({ title: "북마크했어요", description: after.name })
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response?.status
        toast(
          status === 409
            ? { title: "이미 북마크한 곳이에요", description: after.name }
            : { title: "저장하지 못했어요", description: "잠시 뒤에 다시 시도해 주세요.", variant: "destructive" },
        )
      }
    }
    reloadNights()
    if (after?.kind === "savePick") setSheet("save")
  }
  const finishLogin = () => {
    const after = afterLogin
    setAfterLogin(null)
    setSheet(null)
    toast({ title: "로그인했어요" })
    void continueAfterLogin(after)
  }
  // 소셜 로그인에서 돌아왔으면, 로그인 확인이 끝난 뒤에 미뤄 둔 일을 한다
  useEffect(() => {
    if (!resumed || isInitializing) return
    setResumed(null)
    if (isAuthenticated) void continueAfterLogin(resumed)
    // 돌아온 뒤 한 번만 하면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumed, isInitializing, isAuthenticated])
  /** 소셜 로그인으로 떠나기 직전에 보던 것과 하려던 일을 남긴다 */
  const rememberBeforeLeaving = () => {
    const resume: Resume = { tab, date: selectedDate, detailKey, detailSpotId, pick, after: afterLogin }
    try {
      window.sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume))
    } catch {
      // 저장소를 쓸 수 없으면 돌아와서 처음 화면부터 본다
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
      toast({ title: "북마크했어요", description: name })
      setPick(null)
      reloadNights()
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
  const openSettings = useCallback(() => setSheet("settings"), [])
  const openOrigin = useCallback(() => setSheet("origin"), [])
  const openSources = useCallback(() => setSheet("sources"), [])
  const openGuide = useCallback(() => setSheet("guide"), [])
  const closeSheet = useCallback(() => setSheet(null), [])

  /** 장소 카드에 붙이는 저장 버튼 */
  const heroExtras = (place: NightPlace): CardExtras => {
    const saved = place.type === "BOOKMARK"
    const busy = savingKey === placeKey(place)
    const canSave = saved || place.spotId !== undefined
    return {
      // 저장 버튼은 하나만 둔다. 사진 바로 아래라 스크롤하지 않고 누를 수 있고 사진을 가리지 않는다
      save: canSave ? (
        <button
          type="button"
          className="save-pill"
          aria-pressed={saved}
          aria-label={saved ? "북마크됨. 누르면 빼요" : "북마크"}
          disabled={busy}
          onClick={() => void toggleSaved(place)}
        >
          <BookmarkIcon filled={saved} />
          {busy ? (saved ? "빼는 중" : "북마크하는 중") : "북마크"}
        </button>
      ) : null,
    }
  }

  const pickCard = pick ? (
    <div className="peek pickcard">
      <div className="nm">{pickName}</div>
      <div className="sb">
        {joinParts([pick.address, `${pick.lat.toFixed(3)}, ${pick.lon.toFixed(3)}`])}
      </div>
      <PickSky state={pickSky} />
      <div className="pick-actions">
        <button type="button" className="btn" onClick={startFromPick}>
          여기서 출발
        </button>
        {isAuthenticated ? (
          <button type="button" className="btn primary" onClick={() => setSheet("save")}>
            북마크
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={() => askLogin({ kind: "savePick" })}>
            로그인하고 북마크
          </button>
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

  const mapTab = (
    <>
      <div className="sec-title">
        <h2>지도에서 고르기</h2>
      </div>
      <MapPanel
        places={places}
        selectedKey={peekKey}
        topKey={topKey}
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
              selected={placeKey(place) === peekKey}
              onOpen={openPlace}
            />
          ))}
        </div>
      </section>
    </>
  )

  /** 장소 카드가 놓이는 칸의 내용 */
  let content: ReactNode
  /** 후보 목록. 오늘 밤 탭에만 있고, 넓은 화면에서는 카드 옆의 칸에, 그보다 좁으면 카드 아래에 놓인다 */
  let candidates: ReactNode = null
  const refreshing = night.loading ? " refreshing" : ""
  const nightPicker =
    dates.length > 0 && shownDate && tab === "tonight" ? (
      <NightPicker
        counts={goodCounts}
        dates={dates}
        selected={shownDate}
        onSelect={selectDate}
        levels={levels}
        settled={nightSummary.summary !== null}
      />
    ) : null
  /** 장소 화면에 띄우는 곳. 고른 곳이 없으면 그 밤의 1위다 */
  const shownPlace = detailPlace ?? topPlace
  if (night.error) {
    content = <NightError error={night.error} onRetry={reloadNights} />
  } else if (data && tonightDate) {
    content = (
      <div className={`view${refreshing}`} aria-busy={night.loading}>
        {tab === "map" ? (
          mapTab
        ) : shownPlace ? (
          <PlaceView
            key={`${placeKey(shownPlace)}/${data.date}`}
            place={shownPlace}
            placeDate={data.date}
            dates={dates}
            criteria={query}
            save={heroExtras(shownPlace).save}
          />
        ) : (
          // 가볼 만한 곳이 없는 밤. 그 사정과 다른 밤을 먼저 알린다
          <NightCard
            night={data}
            tonightDate={tonightDate}
            laterDates={laterDates}
            query={query}
            selected={null}
            onSelectDate={selectDate}
            extras={heroExtras}
          />
        )}
      </div>
    )
  } else {
    content = <NightSkeleton />
  }
  // 장소 화면은 좁은 화면에서 목록을 덮는 한 화면이다. 넓은 화면에서는 목록이 옆 칸에 그대로 있다
  if (data && tonightDate && !night.error && tab === "tonight") {
    candidates = (
      <>
        <MySection night={data} criteria={query} revision={myRevision} onOpen={openPlace} />
        <NightCandidates
        night={data}
        tonightDate={tonightDate}
        isAuthenticated={isAuthenticated}
        origin={origin}
        shownKey={shownKey}
        beside={isWide}
        onOpenPlace={openPlace}
        onOpenSettings={openSettings}
        onOpenOrigin={openOrigin}
        onLogin={() => askLogin({ kind: "none" })}
        picker={nightPicker}
        footer={
          <p className="credit-line links">
            <button type="button" className="linkish" onClick={openSources}>
              추천 기준과 출처
            </button>
          </p>
        }
        />
      </>
    )
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
        <AccountButton pending={isInitializing} onLogin={() => askLogin({ kind: "none" })} />
        <button type="button" className="gear" aria-label="별 사진 찍기" title="별 사진 찍기" onClick={openGuide}>
          <CameraIcon />
        </button>
        <button type="button" className="gear" aria-label="설정" title="설정" onClick={openSettings}>
          <SettingsIcon />
        </button>
      </header>
      {/* 좁은 화면에서 목록과 지도를 오간다. 넓은 화면에서는 지도가 늘 왼쪽에 있어 두지 않는다 */}
      <nav className="nav only-m" role="tablist" aria-label="보기">
        <button type="button" role="tab" aria-selected={tab === "tonight"} onClick={() => selectTab("tonight")}>
          <TonightTabIcon />
          목록
        </button>
        <button type="button" role="tab" aria-selected={tab === "map"} onClick={() => selectTab("map")}>
          <MapTabIcon />
          지도
        </button>
      </nav>
      <div className="stage">
        <section className="mapcol" aria-label="지도">
          {isDesktop ? (
            <MapPanel
              places={places}
              selectedKey={shownKey}
              topKey={topKey}
              nightDate={data?.date ?? null}
              onSelect={openFromMap}
              pick={pick}
              onPick={pickOnMap}
              origin={origin}
              focusTo={mapFocus}
            >
              {pickCard}
            </MapPanel>
          ) : null}
        </section>
        {/* 오늘 밤 탭은 카드와 목록 두 칸이다. 받는 중에도 목록의 칸을 비워 두어서 카드의 너비가 바뀌지 않는다 */}
        <div className="panel" ref={panelRef} data-cols={tab === "tonight" ? "2" : "1"}>
          <main className="view" ref={cardRef}>
            {content}
          </main>
          {tab === "tonight" ? (
            <aside className={`view side${refreshing}`} aria-label={`${shownNightName} 후보`}>
              {candidates}
            </aside>
          ) : null}
        </div>
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
      {sheet === "guide" ? <GuideSheet onClose={closeSheet} /> : null}
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
      {sheet === "login" ? (
        <LoginSheet
          reason={afterLogin && afterLogin.kind !== "none" ? "save" : undefined}
          onClose={() => {
            setSheet(null)
            setAfterLogin(null)
          }}
          onDone={finishLogin}
          onLeave={rememberBeforeLeaving}
        />
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
