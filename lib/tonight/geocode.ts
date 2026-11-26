/**
 * 지명 검색 API 클라이언트. 이름으로 좌표를 찾고, 좌표가 어느 지역인지 이름을 받는다.
 *
 * 밤 추천과 마찬가지로 같은 출처의 `/api/...`로 부른다(`api.ts`의 설명 참고). 지명 데이터는 백엔드가
 * OpenStreetMap 기반의 Photon과 카카오 로컬에서 받아 와 섞어 준다. 시와 군, 산은 앞의 것이, 전망대와 주차장,
 * 지번 주소는 뒤의 것이 잘 안다.
 */
import type { Coordinates } from "./settings"

const BASE_PATH = "/api/v1/geocode"

/** API가 받는 검색어 길이 */
export const MIN_QUERY_LENGTH = 2
export const MAX_QUERY_LENGTH = 50

/** 검색 결과가 온 곳. 목록 아래에 출처를 적는 데 쓴다 */
export type PlaceProvider = "OSM" | "KAKAO"

/** 검색으로 찾은 장소 */
export interface FoundPlace {
  name: string
  /** 같은 이름을 구분하는 행정구역. 모르면 빈 문자열이다 */
  address: string
  lat: number
  lon: number
  provider: PlaceProvider
}

/** 결과에 섞여 있는 출처를 처음 나온 순서대로 */
export function providersOf(places: FoundPlace[]): PlaceProvider[] {
  return [...new Set(places.map((place) => place.provider))]
}

/** 지도에서 고른 위치. 검색으로 골랐으면 이름이 있고, 빈 곳을 눌러 골랐으면 좌표뿐이다 */
export interface PickedPlace extends Coordinates {
  source: "search" | "map"
  name?: string
  address?: string
}

export class GeocodeError extends Error {
  constructor(
    /** HTTP 상태 코드. 네트워크 오류나 형식 오류는 0이다 */
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "GeocodeError"
  }
}

/** 검색어를 API가 받는 모양으로 다듬는다. 너무 짧으면 null이다 */
export function cleanQuery(raw: string): string | null {
  const query = raw.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH)
  return query.length >= MIN_QUERY_LENGTH ? query : null
}

export function searchUrl(query: string): string {
  return `${BASE_PATH}/search?${new URLSearchParams({ q: query })}`
}

/** 서버가 좌표를 소수 셋째 자리(100m쯤)로 줄여서 찾으므로 그보다 정밀하게 보내지 않는다 */
export function reverseUrl(position: Coordinates): string {
  return `${BASE_PATH}/reverse?${new URLSearchParams({ lat: position.lat.toFixed(3), lon: position.lon.toFixed(3) })}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/** 공통 응답 봉투에서 검색 결과를 꺼낸다. 모양이 다른 항목은 버린다 */
export function unwrapPlaces(body: unknown): FoundPlace[] {
  if (!isRecord(body) || body.success !== true || !Array.isArray(body.data)) {
    throw new GeocodeError(0, "검색 응답의 형식이 올바르지 않습니다.")
  }
  const places: FoundPlace[] = []
  for (const item of body.data) {
    if (!isRecord(item) || typeof item.name !== "string" || !item.name) continue
    if (!isFiniteNumber(item.latitude) || !isFiniteNumber(item.longitude)) continue
    places.push({
      name: item.name,
      address: typeof item.address === "string" ? item.address : "",
      lat: item.latitude,
      lon: item.longitude,
      // 출처를 적기 전의 서버는 OpenStreetMap의 결과만 줬다
      provider: item.source === "KAKAO" ? "KAKAO" : "OSM",
    })
  }
  return places
}

/** 공통 응답 봉투에서 지역 이름을 꺼낸다. 근처에 아무것도 없으면 `name`이 빠져 있고, 그때는 null이다 */
export function unwrapAreaName(body: unknown): string | null {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    throw new GeocodeError(0, "지역 이름 응답의 형식이 올바르지 않습니다.")
  }
  return typeof body.data.name === "string" && body.data.name ? body.data.name : null
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, { headers: { Accept: "application/json" }, signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new GeocodeError(0, "서버에 연결하지 못했습니다.")
  }
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // 본문이 JSON이 아니면 아래에서 상태 코드로만 판단한다
  }
  if (!response.ok) {
    const message = isRecord(body) && typeof body.message === "string" ? body.message : `요청이 실패했습니다 (${response.status}).`
    throw new GeocodeError(response.status, message)
  }
  return body
}

/** 이름으로 장소를 찾는다. `query`는 `cleanQuery`를 거친 값이어야 한다 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<FoundPlace[]> {
  return unwrapPlaces(await getJson(searchUrl(query), signal))
}

/** 좌표가 어느 지역인지 "강릉시 왕산면" 같은 이름으로 받는다 */
export async function fetchAreaName(position: Coordinates, signal?: AbortSignal): Promise<string | null> {
  return unwrapAreaName(await getJson(reverseUrl(position), signal))
}
