/**
 * 천문대와 과학관 목록(`GET /api/v1/spots?kind=FACILITY`).
 *
 * 예약한 프로그램이나 운영 시간에 맞춰 망원경을 보는 곳이라 밤 추천에는 나오지 않는다. 화면에서는 추천 목록과
 * 따로 보여준다. 응답의 모양은 백엔드 저장소의 docs/API.md "관측지"에 있다.
 */
import { safeLinks, type PlaceLink } from "./links"
import type { Coordinates } from "./settings"

const FACILITIES_PATH = "/api/v1/spots?kind=FACILITY"

export interface Facility {
  id: number
  title: string
  address: string
  latitude: number
  longitude: number
  /** 어떤 곳인지 한두 문장 */
  description?: string
  /** 운영 시간과 예약 방법 */
  guide?: string
  /** 휴관처럼 미리 알아 둘 것. 없는 곳이 많다 */
  caution?: string
  /** 운영 시간과 예약을 확인할 공식 페이지. 없으면 빈 목록 */
  links: PlaceLink[]
}

export class SpotsError extends Error {
  constructor(
    /** HTTP 상태 코드. 네트워크 오류나 형식 오류는 0이다. */
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "SpotsError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined
}

/** 공통 응답 봉투에서 시설 목록을 꺼낸다. 이름이나 좌표가 없는 항목과 시설이 아닌 항목은 버린다 */
export function unwrapFacilities(body: unknown): Facility[] {
  if (!isRecord(body) || body.success !== true || !Array.isArray(body.data)) {
    throw new SpotsError(0, "명소 응답의 형식이 올바르지 않습니다.")
  }
  const facilities: Facility[] = []
  for (const item of body.data) {
    if (!isRecord(item) || item.kind !== "FACILITY") continue
    const title = text(item.title)
    if (!isFiniteNumber(item.id) || !title) continue
    if (!isFiniteNumber(item.latitude) || !isFiniteNumber(item.longitude)) continue
    facilities.push({
      id: item.id,
      title,
      address: text(item.address) ?? "",
      latitude: item.latitude,
      longitude: item.longitude,
      description: text(item.description),
      guide: text(item.guide),
      caution: text(item.caution),
      links: safeLinks(item.links),
    })
  }
  return facilities
}

/** 두 좌표 사이의 직선거리(km). 구면 위의 대원 거리다 */
export function straightKm(from: Coordinates, to: Coordinates): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = radians(to.lat - from.lat)
  const dLon = radians(to.lon - from.lon)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)))
}

export interface FacilityWithDistance extends Facility {
  /** 출발 위치에서의 직선거리. 출발 위치를 모르면 없다 */
  distanceKm?: number
}

/**
 * 출발 위치를 알면 가까운 순으로 놓고 거리를 붙인다. 모르면 받은 순서 그대로다.
 * 이동 시간은 적지 않는다. 시설은 추천 대상이 아니라서 서버가 어림한 이동 시간이 없다.
 */
export function nearestFirst(facilities: readonly Facility[], origin: Coordinates | null): FacilityWithDistance[] {
  if (!origin) return [...facilities]
  return facilities
    .map((facility) => ({
      ...facility,
      distanceKm: straightKm(origin, { lat: facility.latitude, lon: facility.longitude }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

/** "직선으로 약 80km". 10km가 안 되면 1km 단위, 넘으면 10km 단위로 적는다 */
export function distanceText(distanceKm: number | undefined): string {
  if (distanceKm === undefined) return ""
  if (distanceKm < 1) return "바로 근처"
  const rounded = distanceKm < 10 ? Math.round(distanceKm) : Math.round(distanceKm / 10) * 10
  return `직선으로 약 ${rounded}km`
}

/** 천문대와 과학관 전체를 받는다. 자주 바뀌지 않는 목록이라 브라우저 캐시를 막지 않는다 */
export async function fetchFacilities(signal?: AbortSignal): Promise<Facility[]> {
  let response: Response
  try {
    response = await fetch(FACILITIES_PATH, { headers: { Accept: "application/json" }, signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new SpotsError(0, "서버에 연결하지 못했습니다.")
  }
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // 본문이 JSON이 아니면 아래에서 상태 코드로만 판단한다
  }
  if (!response.ok) {
    const message = isRecord(body) && typeof body.message === "string" ? body.message : `요청이 실패했습니다 (${response.status}).`
    throw new SpotsError(response.status, message)
  }
  return unwrapFacilities(body)
}
