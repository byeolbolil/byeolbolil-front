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
  const query = facility ? name : `${name} 별 보기`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
