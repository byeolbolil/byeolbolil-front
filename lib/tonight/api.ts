/**
 * 밤 추천 API 클라이언트.
 *
 * 같은 출처의 `/api/...`로 부르고 Next의 rewrite가 백엔드로 넘긴다(`next.config.mjs`). 백엔드 CORS가 운영 도메인과
 * localhost만 허용해서, 브라우저가 백엔드를 직접 부르면 Vercel 미리보기 도메인에서 막힌다.
 */
import type { NightQuery, NightRecommendation } from "./types"

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

/** 날짜가 없으면 오늘 밤, 있으면 그 날짜의 밤을 부르는 경로와 쿼리. */
export function nightUrl(date: string | null, query: NightQuery): string {
  const params = new URLSearchParams()
  if (query.lat !== undefined && query.lon !== undefined) {
    params.set("lat", String(query.lat))
    params.set("lon", String(query.lon))
  }
  if (query.minClearHours !== undefined) params.set("minClearHours", String(query.minClearHours))
  if (query.preferBefore !== undefined) params.set("preferBefore", query.preferBefore)
  if (query.maxTravelMinutes !== undefined) params.set("maxTravelMinutes", String(query.maxTravelMinutes))
  const path = date ? `${BASE_PATH}/nights/${date}` : `${BASE_PATH}/tonight`
  const search = params.toString()
  return search ? `${path}?${search}` : path
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
  return data as unknown as NightRecommendation
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
  const headers: Record<string, string> = { Accept: "application/json" }
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`

  let response: Response
  try {
    response = await fetch(nightUrl(date, query), { headers, signal: options.signal, cache: "no-store" })
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
  return unwrapNight(body)
}
