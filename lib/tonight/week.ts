/**
 * 한 장소의 이번 주 밤(`GET /api/v1/recommendations/week`, `/week/mine`).
 *
 * 밤 추천이 "그 밤에 어디가 좋은가"라면 이쪽은 "그 장소는 이번 주 언제가 좋은가"다. 밤 하나의 값은 밤 추천의
 * 장소 항목과 뜻이 같다. 응답의 모양은 백엔드 저장소의 docs/API.md "한 장소의 이번 주"에 있다.
 */
import { authApi } from "@/lib/api/auth"
import { authStore } from "@/lib/store/authStore"
import { knownNotes, knownSky } from "./clean"
import type { Coordinates } from "./settings"
import { daysBetween, weekdayOf } from "./time"
import type {
  ClearWindow,
  ForecastSource,
  NightHour,
  NightMoon,
  NightNote,
  NightPattern,
  NightQuery,
  RecommendationLevel,
  SkyClass,
} from "./types"
import { levelStars } from "./wording"

const WEEK_PATH = "/api/v1/recommendations/week"

export interface WeekNight {
  /** 밤이 시작하는 날짜(yyyy-MM-dd) */
  date: string
  level: RecommendationLevel
  pattern: NightPattern
  notes: NightNote[]
  bestWindow?: ClearWindow
  moonBrightness: number
  moon?: NightMoon
  hours: NightHour[]
}

export interface WeekPlace {
  /** 저장한 장소면 북마크 ID. 좌표로 물은 위치에는 없다 */
  id?: number
  spotId?: number
  name?: string
  address?: string
  latitude: number
  longitude: number
  /** 하늘 전체의 인공 불빛이 자연 밤하늘 밝기의 몇 배인지. 자료가 없는 곳에는 없다 */
  skyBrightness?: number
  skyClass?: SkyClass
  /** 남한 땅에서의 순위(1~100). 밤 추천과 같다 */
  skyRank?: number
  forecastSource?: ForecastSource
  forecastIssuedAt?: string
  /** 날짜순. 예보가 닿지 않는 밤은 빠져 있고, 예보를 받지 못한 장소는 비어 있다 */
  nights: WeekNight[]
}

export interface WeekOutlook {
  /** 오늘 밤의 날짜 */
  startDate: string
  /** 오늘 밤부터 7일 */
  dates: string[]
  places: WeekPlace[]
}

export class WeekApiError extends Error {
  constructor(
    /** HTTP 상태 코드. 네트워크 오류나 형식 오류는 0이다. */
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "WeekApiError"
  }
}

type Criteria = Pick<NightQuery, "minClearHours" | "preferBefore">

function criteriaParams(criteria: Criteria): URLSearchParams {
  const params = new URLSearchParams()
  if (criteria.minClearHours !== undefined) params.set("minClearHours", String(criteria.minClearHours))
  if (criteria.preferBefore !== undefined) params.set("preferBefore", criteria.preferBefore)
  return params
}

/** 좌표 하나의 이번 주를 묻는 주소. 좌표는 소수 다섯째 자리(약 1m)까지만 보낸다 */
export function weekUrl(position: Coordinates, criteria: Criteria = {}): string {
  const params = new URLSearchParams({ lat: position.lat.toFixed(5), lon: position.lon.toFixed(5) })
  for (const [key, value] of criteriaParams(criteria)) params.set(key, value)
  return `${WEEK_PATH}?${params.toString()}`
}

/** 저장한 장소 전부의 이번 주를 묻는 주소 */
export function myWeekUrl(criteria: Criteria = {}): string {
  const search = criteriaParams(criteria).toString()
  return search ? `${WEEK_PATH}/mine?${search}` : `${WEEK_PATH}/mine`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/** 공통 응답 봉투에서 이번 주를 꺼낸다. 좌표가 없는 장소와 날짜가 없는 밤은 버린다 */
export function unwrapWeek(body: unknown): WeekOutlook {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    throw new WeekApiError(0, "이번 주 응답의 형식이 올바르지 않습니다.")
  }
  const data = body.data
  if (typeof data.startDate !== "string" || !Array.isArray(data.dates) || !Array.isArray(data.places)) {
    throw new WeekApiError(0, "이번 주 응답의 형식이 올바르지 않습니다.")
  }
  const places: WeekPlace[] = []
  for (const item of data.places) {
    if (!isRecord(item) || !isFiniteNumber(item.latitude) || !isFiniteNumber(item.longitude)) continue
    const nights = Array.isArray(item.nights)
      ? item.nights
          .filter(
            (night): night is WeekNight =>
              isRecord(night) && typeof night.date === "string" && typeof night.level === "string" && Array.isArray(night.hours),
          )
          .map((night) => ({ ...night, notes: knownNotes(night.notes) }))
      : []
    const { bortleClass: _bortleClass, skyBrightness: _skyBrightness, skyClass: _skyClass, skyRank: _skyRank, ...rest } = item
    places.push({ ...(rest as unknown as WeekPlace), ...knownSky(item), nights })
  }
  return {
    startDate: data.startDate,
    dates: data.dates.filter((date): date is string => typeof date === "string"),
    places,
  }
}

async function getWeek(url: string, accessToken: string | null, signal?: AbortSignal): Promise<WeekOutlook> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  let response: Response
  try {
    // 예보는 시간이 지나면 틀린 정보가 되므로 브라우저 캐시를 쓰지 않는다
    response = await fetch(url, { headers, signal, cache: "no-store" })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new WeekApiError(0, "서버에 연결하지 못했습니다.")
  }
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // 본문이 JSON이 아니면 아래에서 상태 코드로만 판단한다
  }
  if (!response.ok) {
    const message = isRecord(body) && typeof body.message === "string" ? body.message : `요청이 실패했습니다 (${response.status}).`
    throw new WeekApiError(response.status, message)
  }
  return unwrapWeek(body)
}

/** 좌표 하나의 이번 주. 로그인과 상관없다 */
export function fetchWeek(position: Coordinates, criteria: Criteria, signal?: AbortSignal): Promise<WeekOutlook> {
  return getWeek(weekUrl(position, criteria), null, signal)
}

/**
 * 저장한 장소들의 이번 주. 토큰이 만료됐으면 한 번 재발급해서 다시 받는다.
 * 이 API는 깨진 토큰을 로그인하지 않은 요청으로 받아 빈 목록을 주므로, 부르기 전에 토큰이 있는지 본다.
 */
export async function fetchMyWeek(criteria: Criteria, signal?: AbortSignal): Promise<WeekOutlook> {
  let accessToken = authStore.getState().accessToken
  if (!accessToken) {
    try {
      accessToken = await authApi.reissue()
    } catch {
      throw new WeekApiError(401, "로그인이 필요합니다.")
    }
  }
  return getWeek(myWeekUrl(criteria), accessToken, signal)
}

/** 요일 칸에 적는 짧은 이름: "오늘", "내일", 그 뒤는 "금" */
export function dayLabel(date: string, tonight: string): string {
  const diff = daysBetween(tonight, date)
  if (diff === 0) return "오늘"
  if (diff === 1) return "내일"
  return weekdayOf(date).slice(0, 1)
}

/**
 * 이번 주에서 가장 좋은 밤. 등급이 높은 밤, 같으면 추천 시간이 긴 밤, 그래도 같으면 가까운 밤이다.
 * 별 보기 좋아요(별 2개)에 못 미치는 밤뿐이면 없다.
 */
export function bestNight(nights: readonly WeekNight[]): WeekNight | null {
  let best: WeekNight | null = null
  for (const night of nights) {
    if (levelStars(night.level) < 2) continue
    if (
      best === null ||
      levelStars(night.level) > levelStars(best.level) ||
      (levelStars(night.level) === levelStars(best.level) && (night.bestWindow?.hours ?? 0) > (best.bestWindow?.hours ?? 0))
    ) {
      best = night
    }
  }
  return best
}

/** 주간 요약 한 줄. "금요일 밤이 가장 좋아요", "오늘 밤이 가장 좋아요", "이번 주는 별 보기 어려워요" */
export function weekSummary(nights: readonly WeekNight[], tonight: string): string {
  if (nights.length === 0) return "예보를 받지 못했어요"
  const best = bestNight(nights)
  if (!best) return "이번 주는 별 보기 좋은 밤이 없어요"
  const good = nights.filter((night) => levelStars(night.level) >= 2).length
  const diff = daysBetween(tonight, best.date)
  const name = diff === 0 ? "오늘 밤" : diff === 1 ? "내일 밤" : `${weekdayOf(best.date)} 밤`
  return good > 1 ? `${name}이 가장 좋아요. 좋은 밤이 ${good}번 있어요` : `${name}이 가장 좋아요`
}
