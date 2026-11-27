/**
 * 밤 추천 API 클라이언트. 하룻밤의 장소별 추천과, 7일의 밤마다 가장 좋은 등급을 받는다.
 *
 * 같은 출처의 `/api/...`로 부르고 Next의 rewrite가 백엔드로 넘긴다(`next.config.mjs`). 백엔드 CORS가 운영 도메인과
 * localhost만 허용해서, 브라우저가 백엔드를 직접 부르면 Vercel 미리보기 도메인에서 막힌다.
 */
import { knownNotes, knownSky } from "./clean"
import type { NightMoon, NightQuery, NightRecommendation, NightSummary, RecommendationLevel, SkyClass } from "./types"

const BASE_PATH = "/api/v1/recommendations"

export class NightApiError extends Error {
  constructor(
    /** HTTP 상태 코드. 네트워크 오류나 형식 오류는 0이다. */
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "NightApiError"
  }
}

function withQuery(path: string, query: NightQuery): string {
  const params = new URLSearchParams()
  if (query.lat !== undefined && query.lon !== undefined) {
    params.set("lat", String(query.lat))
    params.set("lon", String(query.lon))
  }
  if (query.minClearHours !== undefined) params.set("minClearHours", String(query.minClearHours))
  if (query.preferBefore !== undefined) params.set("preferBefore", query.preferBefore)
  if (query.maxTravelMinutes !== undefined) params.set("maxTravelMinutes", String(query.maxTravelMinutes))
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

/** 날짜가 없으면 오늘 밤, 있으면 그 날짜의 밤을 부르는 경로와 쿼리. */
export function nightUrl(date: string | null, query: NightQuery): string {
  return withQuery(date ? `${BASE_PATH}/nights/${date}` : `${BASE_PATH}/tonight`, query)
}

/** 7일의 밤마다 가장 좋은 등급을 묻는 경로와 쿼리. 쿼리는 밤 추천과 같다. */
export function nightSummaryUrl(query: NightQuery): string {
  return withQuery(`${BASE_PATH}/nights`, query)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** 공통 응답 봉투에서 `data`를 꺼낸다. 모양이 다르면 받지 않는다. */
export function unwrapNight(body: unknown): NightRecommendation {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    throw new NightApiError(0, "추천 응답의 형식이 올바르지 않습니다.")
  }
  const data = body.data
  if (typeof data.date !== "string" || !Array.isArray(data.places) || !isRecord(data.criteria)) {
    throw new NightApiError(0, "추천 응답의 형식이 올바르지 않습니다.")
  }
  const places = data.places.filter(isRecord).map((place) => {
    // 이전 응답에 있던 Bortle 등급은 받지 않는다. 하늘 밝기로 바뀌었다
    const { bortleClass: _bortleClass, skyBrightness: _skyBrightness, skyClass: _skyClass, skyRank: _skyRank, ...rest } = place
    return { ...rest, ...knownSky(place), notes: knownNotes(place.notes) }
  })
  return { ...data, places } as unknown as NightRecommendation
}

const LEVELS: readonly string[] = ["STRONG", "GOOD", "MAYBE", "NO"]

/**
 * 공통 응답 봉투에서 밤마다의 등급을 꺼낸다. 날짜가 없는 항목은 버리고, 모르는 등급은 등급이 없는 밤으로 둔다.
 */
export function unwrapNightSummary(body: unknown): NightSummary {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    throw new NightApiError(0, "밤 요약 응답의 형식이 올바르지 않습니다.")
  }
  const data = body.data
  if (typeof data.startDate !== "string" || !Array.isArray(data.nights)) {
    throw new NightApiError(0, "밤 요약 응답의 형식이 올바르지 않습니다.")
  }
  const nights: NightSummary["nights"] = []
  for (const item of data.nights) {
    if (!isRecord(item) || typeof item.date !== "string") continue
    const known = typeof item.level === "string" && LEVELS.includes(item.level)
    const night: NightSummary["nights"][number] = known ? { date: item.date, level: item.level as RecommendationLevel } : { date: item.date }
    if (typeof item.goodCount === "number" && Number.isInteger(item.goodCount) && item.goodCount >= 0) night.goodCount = item.goodCount
    nights.push(night)
  }
  return { startDate: data.startDate, nights }
}

export interface FetchNightOptions {
  /** 있으면 내 장소(북마크)도 함께 평가한 결과를 받는다. */
  accessToken?: string | null
  signal?: AbortSignal
}

/**
 * 하룻밤의 추천을 받는다. 예보는 시간이 지나면 틀린 정보가 되므로 브라우저 캐시를 쓰지 않는다.
 */
export async function fetchNight(
  date: string | null,
  query: NightQuery,
  options: FetchNightOptions = {},
): Promise<NightRecommendation> {
  return unwrapNight(await getBody(nightUrl(date, query), options))
}

/** 오늘 밤부터 7일의 밤마다 가장 좋은 등급을 받는다. */
export async function fetchNightSummary(query: NightQuery, options: FetchNightOptions = {}): Promise<NightSummary> {
  return unwrapNightSummary(await getBody(nightSummaryUrl(query), options))
}

/** 응답 본문을 받는다. 실패한 응답은 상태 코드와 서버의 메시지를 담아 던진다. */
async function getBody(url: string, options: FetchNightOptions): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`

  let response: Response
  try {
    response = await fetch(url, { headers, signal: options.signal, cache: "no-store" })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new NightApiError(0, "서버에 연결하지 못했습니다.")
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // 본문이 JSON이 아니면 아래에서 상태 코드로만 판단한다
  }
  if (!response.ok) {
    const message = isRecord(body) && typeof body.message === "string" ? body.message : `요청이 실패했습니다 (${response.status}).`
    throw new NightApiError(response.status, message)
  }
  return body
}

/** 한 좌표의 하늘 밝기. 자료가 있는 범위(한국 둘레) 밖이면 값이 빠지고 좌표만 온다 */
export interface SkyAt {
  skyBrightness?: number
  skyClass?: SkyClass
  skyRank?: number
  /** 둘레 1km가 가로등과 건물 불빛으로 밝은지 */
  litSurroundings?: boolean
}

export function skyUrl(position: { lat: number; lon: number }): string {
  return `${BASE_PATH}/sky?lat=${position.lat.toFixed(5)}&lon=${position.lon.toFixed(5)}`
}

export function unwrapSky(body: unknown): SkyAt {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    throw new NightApiError(0, "하늘 밝기 응답의 형식이 올바르지 않습니다.")
  }
  const sky: SkyAt = knownSky(body.data)
  if (typeof body.data.litSurroundings === "boolean") sky.litSurroundings = body.data.litSurroundings
  return sky
}

/** 한 좌표의 하늘 밝기를 받는다. 예보를 보지 않는 가벼운 요청이다 */
export async function fetchSky(position: { lat: number; lon: number }, signal?: AbortSignal): Promise<SkyAt> {
  return unwrapSky(await getBody(skyUrl(position), { signal }))
}

/** 시간 구간. 한국 시간 ISO 문자열이다 */
export interface MoonSpan {
  start: string
  end: string
}

/** 달력의 하룻밤. 예보 없이 해와 달의 위치만으로 정해진다 */
export interface MoonCalendarNight {
  date: string
  moon: NightMoon
  /** 하늘이 어두운 구간(태양 고도 -12° 이하). 그만큼 어두워지지 않으면 없다 */
  dark?: MoonSpan
  /** 어두운 구간 가운데 달이 지평선 아래에 있는 구간. 시간순이고, 달이 밤새 떠 있으면 비어 있다 */
  moonless: MoonSpan[]
  moonlessMinutes: number
}

export interface MoonCalendar {
  startDate: string
  nights: MoonCalendarNight[]
}

export function moonUrl(position: { lat: number; lon: number }): string {
  return `${BASE_PATH}/moon?lat=${position.lat.toFixed(5)}&lon=${position.lon.toFixed(5)}`
}

function isSpan(value: unknown): value is MoonSpan {
  return isRecord(value) && typeof value.start === "string" && typeof value.end === "string"
}

/** 달력 응답에서 모양이 맞는 밤만 받는다. 달 모양이 없는 밤은 그릴 수 없어서 버린다 */
export function unwrapMoon(body: unknown): MoonCalendar {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    throw new NightApiError(0, "달력 응답의 형식이 올바르지 않습니다.")
  }
  const data = body.data
  if (typeof data.startDate !== "string" || !Array.isArray(data.nights)) {
    throw new NightApiError(0, "달력 응답의 형식이 올바르지 않습니다.")
  }
  const nights: MoonCalendarNight[] = []
  for (const item of data.nights) {
    if (!isRecord(item) || typeof item.date !== "string" || !isRecord(item.moon)) continue
    const moon = item.moon
    if (typeof moon.illuminatedFraction !== "number" || typeof moon.waxing !== "boolean") continue
    const night: MoonCalendarNight = {
      date: item.date,
      moon: {
        illuminatedFraction: moon.illuminatedFraction,
        waxing: moon.waxing,
        ...(typeof moon.rise === "string" ? { rise: moon.rise } : {}),
        ...(typeof moon.set === "string" ? { set: moon.set } : {}),
      },
      moonless: Array.isArray(item.moonless) ? item.moonless.filter(isSpan) : [],
      moonlessMinutes: typeof item.moonlessMinutes === "number" ? item.moonlessMinutes : 0,
    }
    if (isSpan(item.dark)) night.dark = item.dark
    nights.push(night)
  }
  return { startDate: data.startDate, nights }
}

/** 한 좌표의 앞으로 6주의 달. 예보를 보지 않는 가벼운 요청이다 */
export async function fetchMoon(position: { lat: number; lon: number }, signal?: AbortSignal): Promise<MoonCalendar> {
  return unwrapMoon(await getBody(moonUrl(position), { signal }))
}
