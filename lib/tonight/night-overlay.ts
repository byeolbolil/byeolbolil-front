/**
 * 광해 지도에 겹치는 자료의 위치.
 *
 * `scripts/render_light_layers.py`가 백엔드의 하늘 밝기 격자(밤 추천이 장소마다 읽는 것과 같은 격자)와 위성 불빛
 * 원본으로 만든다. 그림 세 장은 아래 범위를 웹 메르카토르로 그렸고, 스크립트가 마지막에 출력하는 범위와 같아야 한다.
 * 다르면 밝은 곳이 지도와 어긋난다.
 */
export const LIGHT_MAP = {
  /** 하늘 밝기가 자연의 2배 아래인 곳을 옅은 푸른빛으로 칠한 그림 */
  skyDark: "/map/sky-dark.webp",
  /** 은하수가 보이지 않는 하늘(10배 이상) 둘레의 빛무리 */
  skyGlow: "/map/sky-glow.webp",
  /** 위성이 본 불빛 */
  lights: "/map/lights.webp",
  /** 하늘 밝기 2, 3, 5, 10배의 경계선. 속성 level이 배수다 */
  skyLines: "/map/sky-lines.geojson",
  west: 124.5,
  east: 131.0,
  south: 32.9,
  north: 38.7,
} as const

/** 하늘 밝기 경계선 가운데 장소 카드의 등급 경계와 같은 값. 나머지(3, 5)는 사이를 읽으려고 더한 눈금이다 */
export const SKY_LINE_CLASS_BOUNDS = [2, 10] as const

/** MapLibre image 소스의 좌표 순서: 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래. */
export const LIGHT_MAP_CORNERS: [[number, number], [number, number], [number, number], [number, number]] = [
  [LIGHT_MAP.west, LIGHT_MAP.north],
  [LIGHT_MAP.east, LIGHT_MAP.north],
  [LIGHT_MAP.east, LIGHT_MAP.south],
  [LIGHT_MAP.west, LIGHT_MAP.south],
]

/**
 * 기본 지도. OpenFreeMap의 공개 스타일을 그대로 쓴다. 키와 가입이 필요 없고 상업 이용이 허용되며, 출처 표기
 * (OpenFreeMap © OpenMapTiles Data from OpenStreetMap)가 필요하다. MapLibre가 스타일의 출처를 지도에 자동으로 적는다.
 * https://openfreemap.org/
 */
export const MAP_STYLES = {
  /** 광해와 구름 레이어 아래에 까는 어두운 지도 */
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
