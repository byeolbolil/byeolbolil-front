/**
 * 밤 불빛 이미지와 지도 스타일의 위치 정보.
 *
 * 이미지는 `scripts/render_night_overlay.py`가 VIIRS 야간광 값으로 그린 것이고, 아래 범위를 웹 메르카토르로 그렸다.
 * 스크립트의 LON0, LON1, LAT0, LAT1과 같아야 한다. 다르면 불빛이 지도와 어긋난다.
 */
export const NIGHT_OVERLAY = {
  url: "/map/night-lights.webp",
  west: 124.5,
  east: 131.0,
  south: 33.0,
  north: 38.75,
} as const

/** MapLibre image 소스의 좌표 순서: 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래. */
export const NIGHT_OVERLAY_CORNERS: [[number, number], [number, number], [number, number], [number, number]] = [
  [NIGHT_OVERLAY.west, NIGHT_OVERLAY.north],
  [NIGHT_OVERLAY.east, NIGHT_OVERLAY.north],
  [NIGHT_OVERLAY.east, NIGHT_OVERLAY.south],
  [NIGHT_OVERLAY.west, NIGHT_OVERLAY.south],
]

/**
 * 기본 지도. OpenFreeMap의 공개 스타일을 그대로 쓴다. 키와 가입이 필요 없고 상업 이용이 허용되며, 출처 표기
 * (OpenFreeMap © OpenMapTiles Data from OpenStreetMap)가 필요하다. MapLibre가 스타일의 출처를 지도에 자동으로 적는다.
 * https://openfreemap.org/
 */
export const MAP_STYLES = {
  /** 밤 불빛과 구름 레이어 아래에 까는 어두운 지도 */
  dark: "https://tiles.openfreemap.org/styles/dark",
  /** 일반 지도 */
  base: "https://tiles.openfreemap.org/styles/liberty",
} as const

/** 처음에 보여주는 범위. 제주에서 강원 북부까지다. */
export const KOREA_BOUNDS: [[number, number], [number, number]] = [
  [125.6, 33.0],
  [129.8, 38.7],
]

export type MapLayer = "night" | "cloud" | "base"

export const MAP_LAYERS: ReadonlyArray<{ value: MapLayer; label: string }> = [
  { value: "night", label: "광해 지도" },
  { value: "cloud", label: "구름" },
  { value: "base", label: "일반 지도" },
]
