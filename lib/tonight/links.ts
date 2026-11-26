/**
 * 장소의 참고 링크. 가는 길과 서는 자리를 더 자세히 적은 남의 글이고, 시설은 공식 페이지다.
 *
 * 서버가 적어 둔 글은 사라질 수 있어서, 그 장소 이름으로 검색하는 링크를 항상 함께 둔다.
 */
export interface PlaceLink {
  /** 그 글의 제목 */
  title: string
  url: string
  /** 그 글이 대표 이미지로 내건 주소. 남의 서버에 있는 파일이라 받지 못할 수 있다 */
  imageUrl?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** 응답에서 온 링크 가운데 제목이 있고 http(s)로 여는 것만 남긴다. 값이 없거나 모양이 다르면 빈 목록이다 */
export function safeLinks(value: unknown): PlaceLink[] {
  if (!Array.isArray(value)) return []
  const links: PlaceLink[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.title !== "string" || typeof item.url !== "string") continue
    const title = item.title.trim()
    if (!title || !/^https?:\/\//i.test(item.url)) continue
    try {
      links.push({ title, url: new URL(item.url).toString(), imageUrl: safeImage(item.imageUrl) })
    } catch {
      // 주소로 읽을 수 없는 값은 버린다
    }
  }
  return links
}

/** 미리보기 이미지는 https로 여는 것만 쓴다. http 이미지는 브라우저가 막는다 */
function safeImage(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^https:\/\//i.test(value)) return undefined
  try {
    return new URL(value).toString()
  } catch {
    return undefined
  }
}

/** 링크 옆에 적는 사이트 이름. "https://m.cafe.daum.net/..."는 "cafe.daum.net"이 된다 */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^(www|m|korean)\./, "")
  } catch {
    return ""
  }
}

/**
 * 그 장소를 구글에서 찾는 주소. 관측지는 별 보러 간 후기가 나오도록 "별 보기"를 붙이고, 시설은 이름만으로 찾는다.
 */
export function searchUrl(name: string, facility = false): string {
  return `https://www.google.com/search?q=${encodeURIComponent(searchQuery(name, facility))}`
}

/** 같은 검색을 네이버에서. 국내 후기는 네이버 블로그와 카페에 많다 */
export function naverSearchUrl(name: string, facility = false): string {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(searchQuery(name, facility))}`
}

function searchQuery(name: string, facility: boolean): string {
  return facility ? name : `${name} 별 보기`
}

/** 명소 안에서 서서 보는 자리 하나. 첫 자리가 차를 대는 곳이다 */
export interface PlacePoint {
  name: string
  /** 어떻게 가는지와 어떤 자리인지 */
  access: string
  /** 좌표를 아는 자리에만 있다 */
  latitude?: number
  longitude?: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/** 응답에서 온 보는 자리 가운데 이름과 설명이 있는 것만 남긴다. 좌표는 둘 다 숫자일 때만 받는다 */
export function safePoints(value: unknown): PlacePoint[] {
  if (!Array.isArray(value)) return []
  const points: PlacePoint[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.name !== "string" || typeof item.access !== "string") continue
    const name = item.name.trim()
    const access = item.access.trim()
    if (!name || !access) continue
    const located = isFiniteNumber(item.latitude) && isFiniteNumber(item.longitude)
    points.push(located ? { name, access, latitude: item.latitude as number, longitude: item.longitude as number } : { name, access })
  }
  return points
}

/** 그 자리를 카카오맵에서 여는 주소. 좌표를 모르면 없다 */
export function pointMapUrl(placeName: string, point: PlacePoint): string | null {
  if (point.latitude === undefined || point.longitude === undefined) return null
  const label = `${placeName} ${point.name}`
  return `https://map.kakao.com/link/map/${encodeURIComponent(label)},${point.latitude},${point.longitude}`
}
