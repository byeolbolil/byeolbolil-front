/**
 * 사용자가 바꿀 수 있는 설정과, 그것을 밤 추천 API의 쿼리로 옮기는 방법.
 * 설정은 localStorage에 남는다. 저장된 값은 믿지 않고 `parseSettings`로 걸러서 읽는다.
 */
import { findCity } from "./cities"
import type { NightQuery } from "./types"

export type ViewMode = "simple" | "detailed"

/** "몇 시까지 볼 수 있나요?"의 답. `all`은 밤새다. */
export type PreferBefore = "00:00" | "01:00" | "02:00" | "03:00" | "all"

/** "얼마나 멀리 갈 수 있나요?"의 답(분). `null`은 상관없음이다. */
export type MaxTravelMinutes = 60 | 120 | 180 | null

export type OriginSetting = { kind: "gps" } | { kind: "city"; name: string } | { kind: "none" }

export interface Settings {
  viewMode: ViewMode
  preferBefore: PreferBefore
  maxTravelMinutes: MaxTravelMinutes
  /** "꼭 가볼 만해요"에 필요한 맑은 시간. API는 1~8을 받는다. */
  minClearHours: number
  redScreen: boolean
  origin: OriginSetting
}

export interface Coordinates {
  lat: number
  lon: number
}

export const PREFER_BEFORE_OPTIONS: ReadonlyArray<{ value: PreferBefore; label: string }> = [
  { value: "00:00", label: "자정" },
  { value: "01:00", label: "새벽 1시" },
  { value: "02:00", label: "새벽 2시" },
  { value: "03:00", label: "새벽 3시" },
  { value: "all", label: "밤새" },
]

export const MAX_TRAVEL_OPTIONS: ReadonlyArray<{ value: MaxTravelMinutes; label: string }> = [
  { value: 60, label: "1시간" },
  { value: 120, label: "2시간" },
  { value: 180, label: "3시간" },
  { value: null, label: "상관없어요" },
]

export const MIN_CLEAR_HOURS_RANGE = { min: 1, max: 8 } as const

/**
 * 기본값. 맑은 시간 3시간과 새벽 2시는 서버의 기본 정책과 같다(백엔드 `docs/SCORING.md` "관측 시간대").
 * 이동 시간 3시간은 목업의 기본값이다.
 */
export const DEFAULT_SETTINGS: Settings = {
  viewMode: "simple",
  preferBefore: "02:00",
  maxTravelMinutes: 180,
  minClearHours: 3,
  redScreen: false,
  origin: { kind: "gps" },
}

/**
 * "밤새"일 때 보내는 `preferBefore`. API에는 선호 시각을 끄는 값이 없다. 정오 전 시각은 다음 날로 읽으므로
 * 11:59를 보내면 해가 뜰 때까지의 모든 시간이 선호 시간에 든다.
 */
export const PREFER_ALL_NIGHT = "11:59"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function parseOrigin(value: unknown): OriginSetting {
  if (!isRecord(value)) return DEFAULT_SETTINGS.origin
  if (value.kind === "none") return { kind: "none" }
  if (value.kind === "city" && typeof value.name === "string" && findCity(value.name)) {
    return { kind: "city", name: value.name }
  }
  return { kind: "gps" }
}

/** 저장된 값을 설정으로 읽는다. 모르는 값이나 범위를 벗어난 값은 기본값으로 바꾼다. */
export function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return DEFAULT_SETTINGS
  const preferBefore = PREFER_BEFORE_OPTIONS.find((option) => option.value === raw.preferBefore)?.value
  const maxTravel = MAX_TRAVEL_OPTIONS.find((option) => option.value === raw.maxTravelMinutes)
  const minClearHours =
    typeof raw.minClearHours === "number" &&
    Number.isInteger(raw.minClearHours) &&
    raw.minClearHours >= MIN_CLEAR_HOURS_RANGE.min &&
    raw.minClearHours <= MIN_CLEAR_HOURS_RANGE.max
      ? raw.minClearHours
      : DEFAULT_SETTINGS.minClearHours
  return {
    viewMode: raw.viewMode === "detailed" ? "detailed" : "simple",
    preferBefore: preferBefore ?? DEFAULT_SETTINGS.preferBefore,
    maxTravelMinutes: maxTravel ? maxTravel.value : DEFAULT_SETTINGS.maxTravelMinutes,
    minClearHours,
    redScreen: raw.redScreen === true,
    origin: parseOrigin(raw.origin),
  }
}

/**
 * 출발 좌표를 정한다. 현재 위치를 쓰기로 했는데 위치를 받지 못했으면 출발지가 없는 것이다.
 */
export function resolveOrigin(origin: OriginSetting, gps: Coordinates | null): Coordinates | null {
  if (origin.kind === "none") return null
  if (origin.kind === "city") {
    const city = findCity(origin.name)
    return city ? { lat: city.lat, lon: city.lon } : null
  }
  return gps
}

/** 좌표를 소수 둘째 자리(약 1km)로 줄인다. 이동 시간 어림에는 충분하고, 정확한 위치를 서버로 보내지 않는다. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100
}

/** 설정과 출발 좌표를 API 쿼리로 옮긴다. 이동 시간 한도는 출발지가 있을 때만 보낸다. */
export function toNightQuery(settings: Settings, origin: Coordinates | null): NightQuery {
  const query: NightQuery = {
    minClearHours: settings.minClearHours,
    preferBefore: settings.preferBefore === "all" ? PREFER_ALL_NIGHT : settings.preferBefore,
  }
  if (origin) {
    query.lat = roundCoordinate(origin.lat)
    query.lon = roundCoordinate(origin.lon)
    if (settings.maxTravelMinutes !== null) query.maxTravelMinutes = settings.maxTravelMinutes
  }
  return query
}

/** 헤더의 출발 위치 버튼에 적는 말. */
export function originLabel(origin: OriginSetting, gps: Coordinates | null): string {
  if (origin.kind === "city") return `${origin.name} 기준`
  if (origin.kind === "gps" && gps) return "현재 위치 기준"
  return "출발 위치 정하기"
}
