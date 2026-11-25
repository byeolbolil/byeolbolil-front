/**
 * 밤 추천 API(`GET /api/v1/recommendations/tonight`, `/nights/{date}`)의 응답 타입.
 * 백엔드 `NightRecommendationResponse`와 같은 모양이다. 값이 없으면 필드가 빠진다(null이 아니다).
 */

export type PlaceType = "SPOT" | "BOOKMARK"

export type RecommendationLevel = "STRONG" | "GOOD" | "MAYBE" | "NO"

export type NightPattern =
  | "CLEAR_ALL_NIGHT"
  | "CLEAR_EARLY"
  | "CLEARS_LATE"
  | "CLEARS_AGAIN"
  | "BRIEF_CLEAR"
  | "CLOUDY_ALL_NIGHT"

export type NightNote = "CLEARS_LATE" | "BRIGHT_MOON" | "CITY_LIGHTS" | "DEW"

export type ForecastSource = "OPEN_METEO" | "MET_NORWAY"

/** 한 시간 칸. `time`부터 1시간이고, 한국 시간의 ISO 8601 문자열이다. */
export interface NightHour {
  time: string
  dark: boolean
  clear: boolean
  cloudCover: number
  cloudCoverLow: number
  cloudCoverMid: number
  cloudCoverHigh: number
  relativeHumidity: number
  moonUp: boolean
  score: number
}

export interface ClearWindow {
  start: string
  end: string
  hours: number
}

export interface TravelEstimate {
  distanceKm: number
  minutes: number
}

/** 그 장소에서 본 그 밤의 달 */
export interface NightMoon {
  /** 밝게 보이는 면의 비율. 삭 0, 보름 1 */
  illuminatedFraction: number
  /** 차오르는 중이면 true, 기우는 중이면 false */
  waxing: boolean
  /** 그날 정오부터 다음 날 정오 사이에 달이 뜨는 시각. 그 사이에 뜨지 않으면 없다 */
  rise?: string
  set?: string
}

export interface NightPlace {
  type: PlaceType
  id: number
  spotId?: number
  name: string
  address?: string
  latitude: number
  longitude: number
  level: RecommendationLevel
  pattern: NightPattern
  notes: NightNote[]
  bestWindow?: ClearWindow
  travel?: TravelEstimate
  bortleClass: number
  moonBrightness: number
  /** 달의 모양과 뜨고 지는 시각. 이 값을 주기 전에 받아 둔 응답에는 없다 */
  moon?: NightMoon
  forecastSource: ForecastSource
  forecastIssuedAt?: string
  hours: NightHour[]
}

export interface NightCriteria {
  minClearHours: number
  preferBefore: string
  /** 이동 시간 한도를 적용하지 않았으면 null로 온다. */
  maxTravelMinutes?: number | null
}

export interface NightRecommendation {
  date: string
  criteria: NightCriteria
  candidateCount: number
  evaluatedCount: number
  excludedByTravelCount: number
  places: NightPlace[]
}

/** 요청 쿼리. 모두 선택이고, 출발지는 위도와 경도를 함께 보내야 한다. */
export interface NightQuery {
  lat?: number
  lon?: number
  minClearHours?: number
  preferBefore?: string
  maxTravelMinutes?: number
}
