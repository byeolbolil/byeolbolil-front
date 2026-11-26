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

export type NightNote = "CLEARS_LATE" | "BRIGHT_MOON" | "CITY_LIGHTS" | "LIGHTS_IN_VIEW" | "DEW"

/** 하늘 밝기로 나눈 등급. 어두운 쪽부터 */
export type SkyClass = "NATURAL" | "DARK" | "RURAL" | "SUBURBAN" | "URBAN"

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
  /** 실제로 차를 대고 보는 지점의 이름("멍에전망대 주차장"). 좌표가 가리키는 곳이다. 명소에만 있다 */
  viewpoint?: string
  /** 어떤 곳인지 한두 문장. 명소에만 있다 */
  description?: string
  /** 가는 법과 주차. 명소에만 있다 */
  guide?: string
  /** 계절 폐쇄, 조명, 통제 같은 주의 사항 */
  caution?: string
  /** 가는 길과 서는 자리를 더 자세히 적은 글. 없는 곳이 있고, 쓰기 전에 safeLinks로 거른다 */
  links?: { title: string; url: string; imageUrl?: string }[]
  /** 이 명소 안에서 서서 보는 자리들. 자리가 하나뿐인 곳에는 없다. 쓰기 전에 safePoints로 거른다 */
  points?: { name: string; access: string; latitude?: number; longitude?: number }[]
  /** 이 명소에서 별을 본 유튜브 영상. 찾지 못한 곳에는 없다. 쓰기 전에 safeVideos로 거른다 */
  videos?: { title: string; channel: string; url: string; thumbnailUrl: string; shortForm: boolean }[]
  level: RecommendationLevel
  pattern: NightPattern
  notes: NightNote[]
  bestWindow?: ClearWindow
  travel?: TravelEstimate
  /** 하늘 전체의 인공 불빛이 자연 밤하늘 밝기의 몇 배인지. 자료가 없는 곳(한국 둘레 밖)에는 없다 */
  skyBrightness?: number
  /** 하늘 밝기로 나눈 등급. `skyBrightness`가 없으면 같이 없다 */
  skyClass?: SkyClass
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

/**
 * 오늘 밤부터 7일의 밤마다 후보 가운데 가장 좋은 등급(`GET /api/v1/recommendations/nights`).
 * 같은 조건으로 받은 그 밤 추천의 첫 장소 등급과 같다.
 */
export interface NightSummary {
  /** 오늘 밤의 날짜 */
  startDate: string
  /** 날짜순. 평가한 장소가 없는 밤은 `level`이 빠져 있다 */
  nights: { date: string; level?: RecommendationLevel }[]
}

/** 요청 쿼리. 모두 선택이고, 출발지는 위도와 경도를 함께 보내야 한다. */
export interface NightQuery {
  lat?: number
  lon?: number
  minClearHours?: number
  preferBefore?: string
  maxTravelMinutes?: number
}
