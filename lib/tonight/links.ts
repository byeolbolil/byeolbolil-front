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

/** 영상을 찾을 때 쓰는 말. 후기 검색보다 짧게, 장소 이름에 "별"만 붙인다 */
function videoQuery(name: string): string {
  return encodeURIComponent(`${name} 별`)
}

/** 그 장소에서 별을 본 영상을 유튜브에서 찾는 주소. 골라 둔 영상이 없는 곳에서도 찾아볼 수 있게 한다 */
export function youtubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${videoQuery(name)}`
}

/**
 * 구글의 "짧은 동영상" 탭을 여는 주소. 인스타그램 릴스와 유튜브 쇼츠가 미리보기와 함께 나온다.
 * 구글은 검색 결과를 내주는 API를 닫았고 인스타그램은 미리보기를 내주지 않아서, 우리 화면에 싣지 못하는 영상은
 * 이 탭으로 보낸다. udm=39가 그 탭이다. 구글이 문서로 밝힌 값은 아니어서, 바뀌면 일반 검색 결과가 열린다.
 */
export function googleShortVideoUrl(name: string): string {
  return `https://www.google.com/search?q=${videoQuery(name)}&udm=39`
}

/** 네이버 검색의 "클립" 탭을 여는 주소. 네이버가 검색 화면의 클립 탭에 거는 주소와 같다 */
export function naverClipUrl(name: string): string {
  return `https://m.search.naver.com/search.naver?ssc=tab.m_clip.all&query=${videoQuery(name)}`
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

/** 그 명소에서 별을 본 유튜브 영상 하나. 제목과 채널 이름은 유튜브가 알려 준 그대로다 */
export interface PlaceVideo {
  title: string
  /** 올린 채널의 이름 */
  channel: string
  url: string
  /** 미리보기 그림. 유튜브의 그림 서버에 있다 */
  thumbnailUrl: string
  /** 쇼츠인지 */
  shortForm: boolean
}

const YOUTUBE_HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"])
const YOUTUBE_IMAGE_HOSTS = new Set(["i.ytimg.com", "img.youtube.com"])

/** https로 여는 주소이고 호스트가 허락한 곳일 때만 돌려준다 */
function httpsOn(value: unknown, hosts: Set<string>): string | null {
  if (typeof value !== "string") return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" && hosts.has(url.hostname) ? url.toString() : null
  } catch {
    return null
  }
}

/**
 * 응답에서 온 영상 가운데 제목이 있고 유튜브로 여는 것만 남긴다. 주소와 그림이 유튜브의 것이 아니면 버린다.
 * 영상 카드는 남의 사이트로 내보내는 링크라, 서버가 준 값이라도 어디로 가는지 확인한다.
 */
export function safeVideos(value: unknown): PlaceVideo[] {
  if (!Array.isArray(value)) return []
  const videos: PlaceVideo[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.title !== "string") continue
    const title = item.title.trim()
    const url = httpsOn(item.url, YOUTUBE_HOSTS)
    const thumbnailUrl = httpsOn(item.thumbnailUrl, YOUTUBE_IMAGE_HOSTS)
    if (!title || !url || !thumbnailUrl) continue
    videos.push({
      title,
      channel: typeof item.channel === "string" ? item.channel.trim() : "",
      url,
      thumbnailUrl,
      shortForm: item.shortForm === true,
    })
  }
  return videos
}

/**
 * 유튜브는 지워진 영상의 미리보기 자리에 120×90의 빈 그림을 준다. 받은 그림이 이보다 작으면 영상이 없는 것이다.
 * 우리가 부르는 그림은 320×180이다.
 */
export const MISSING_VIDEO_THUMB_MAX_WIDTH = 120

/**
 * 그 명소에서 별을 본 인스타그램 게시물 하나. 인스타그램은 제목과 미리보기 그림을 내주지 않아서 카드에 그림이 없고,
 * 누르면 인스타그램의 임베드 주소로 게시물을 그대로 보여 준다
 */
export interface PlaceReel {
  /** 어떤 영상인지 서버가 적어 둔 한 줄 */
  title: string
  /** 올린 계정의 이름. 앞의 @는 뗀다 */
  account: string
  url: string
  /** iframe에 넣는 주소 */
  embedUrl: string
}

const INSTAGRAM_HOSTS = new Set(["www.instagram.com"])

/**
 * 응답에서 온 게시물 가운데 설명이 있고 두 주소가 모두 인스타그램의 것인 것만 남긴다. 임베드 주소는 우리 화면 안의
 * 프레임에 넣는 것이라, 인스타그램의 임베드 경로(/embed/로 끝난다)가 아니면 버린다.
 */
export function safeReels(value: unknown): PlaceReel[] {
  if (!Array.isArray(value)) return []
  const reels: PlaceReel[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.title !== "string") continue
    const title = item.title.trim()
    const url = httpsOn(item.url, INSTAGRAM_HOSTS)
    const embedUrl = httpsOn(item.embedUrl, INSTAGRAM_HOSTS)
    if (!title || !url || !embedUrl || !new URL(embedUrl).pathname.endsWith("/embed/")) continue
    reels.push({
      title,
      account: typeof item.account === "string" ? item.account.trim().replace(/^@/, "") : "",
      url,
      embedUrl,
    })
  }
  return reels
}
