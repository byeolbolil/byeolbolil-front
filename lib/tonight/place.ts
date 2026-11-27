/**
 * 장소를 화면에 적는 방법: 짧은 지역 이름, 이동 시간 문구, 목록에서 쓰는 키.
 */
import type { NightPlace, TravelEstimate } from "./types"

const PROVINCE_SHORT: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원도: "강원",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전라북도: "전북",
  전북특별자치도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주도: "제주",
  제주특별자치도: "제주",
}

/**
 * 북마크를 뺀 뒤에도 장소 화면에 남겨 두는 모습. 명소를 저장한 것이면 그 명소로 돌아가고(명소의 `id`는 명소 ID다),
 * 직접 고른 위치면 저장하지 않은 곳으로 남는다. 그런 곳은 명소 ID와 겹치지 않게 북마크 ID에 음수를 붙인다.
 */
export function unsavedPlace(place: NightPlace): NightPlace {
  if (place.spotId !== undefined) return { ...place, type: "SPOT", id: place.spotId }
  return { ...place, type: "SPOT", id: -Math.abs(place.id) }
}

/** 명소가 아닌데 저장되지 않은 곳. 북마크를 뺀 직접 고른 위치다 */
export function isUnsavedCustom(place: Pick<NightPlace, "type" | "spotId">): boolean {
  return place.type === "SPOT" && place.spotId === undefined
}

/** 두 장소가 같은 자리인지. 같은 곳을 다시 북마크하면 ID가 바뀌므로 좌표로 찾는다 */
export function samePosition(a: Pick<NightPlace, "latitude" | "longitude">, b: Pick<NightPlace, "latitude" | "longitude">): boolean {
  return Math.abs(a.latitude - b.latitude) < 1e-6 && Math.abs(a.longitude - b.longitude) < 1e-6
}

/** 장소를 가리키는 키. 명소와 북마크의 ID가 겹칠 수 있어서 종류를 함께 쓴다. */
export function placeKey(place: Pick<NightPlace, "type" | "id">): string {
  return `${place.type}-${place.id}`
}

/**
 * 도로명 주소를 "강원 화천"처럼 줄인다. 시도 이름으로 시작하지 않는 주소(직접 저장한 장소 등)는 그대로 둔다.
 */
export function regionOf(address: string | undefined): string {
  if (!address) return ""
  const [first, second] = address.trim().split(/\s+/)
  const province = PROVINCE_SHORT[first]
  if (!province) return address.trim()
  if (!second) return province
  const district = second.length > 2 ? second.replace(/[시군구]$/, "") : second
  return `${province} ${district}`
}

/**
 * 이동 시간 문구. 직선거리로 어림한 값이라 "약"을 붙이고 10분 단위로 적는다. 출발지를 모르면 빈 문자열이다.
 */
export function travelText(travel: TravelEstimate | undefined): string {
  if (!travel) return ""
  if (travel.minutes < 5) return "지금 있는 곳 근처"
  const rounded = Math.max(10, Math.round(travel.minutes / 10) * 10)
  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60
  const parts = [hours ? `${hours}시간` : "", minutes ? `${minutes}분` : ""].filter(Boolean)
  return `차로 약 ${parts.join(" ")}`
}

/**
 * 카카오맵 길찾기 링크. 도착지 이름과 좌표만 넘긴다.
 * 좌표는 차를 대는 지점의 것이라, 그 지점의 이름이 있으면 도착지 이름에 함께 적는다.
 */
export function directionsUrl(place: Pick<NightPlace, "name" | "latitude" | "longitude" | "viewpoint">): string {
  const label = place.viewpoint ? `${place.name} (${place.viewpoint})` : place.name
  return `https://map.kakao.com/link/to/${encodeURIComponent(label)},${place.latitude},${place.longitude}`
}

/** 값이 있는 조각만 " · "로 잇는다. */
export function joinParts(parts: Array<string | undefined | null | false>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ")
}
