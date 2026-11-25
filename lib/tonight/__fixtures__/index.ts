/**
 * 테스트용 기록 응답. 2026-11-24에 운영 API가 서울 마포(37.55, 126.91) 기준으로 준 응답에서 장소 네 곳만 남겼다.
 * 가볼 만한 곳 둘(밤새 맑음, 흐렸다 갬), 도시 불빛으로 낮아진 곳, 밤새 흐린 곳이다.
 */
import recorded from "./tonight-2026-11-24.json"
import { unwrapNight } from "../api"
import type { NightHour, NightPlace, NightRecommendation } from "../types"

export function recordedNight(): NightRecommendation {
  return unwrapNight(structuredClone(recorded))
}

/** 18시부터 한 시간 간격으로 이어지는 칸을 만든다. 각 칸의 값은 `cells`로 덮어쓴다. */
export function makeHours(cells: Array<Partial<NightHour>>, startHour = 18, date = "2026-11-24"): NightHour[] {
  const [y, m, d] = date.split("-").map(Number)
  const base = Date.UTC(y, m - 1, d, startHour - 9)
  return cells.map((cell, index) => {
    const local = new Date(base + index * 3_600_000 + 9 * 3_600_000).toISOString().slice(0, 19)
    return {
      time: `${local}+09:00`,
      dark: true,
      clear: false,
      cloudCover: 50,
      cloudCoverLow: 0,
      cloudCoverMid: 0,
      cloudCoverHigh: 0,
      relativeHumidity: 50,
      moonUp: false,
      score: 0,
      ...cell,
    }
  })
}

export function makePlace(overrides: Partial<NightPlace> = {}): NightPlace {
  return {
    type: "SPOT",
    id: 1,
    spotId: 1,
    name: "시험 장소",
    address: "강원특별자치도 화천군 사내면 천문대길 431",
    latitude: 38.1,
    longitude: 127.4,
    level: "GOOD",
    pattern: "CLEAR_ALL_NIGHT",
    notes: [],
    skyBrightness: 3.2,
    skyClass: "RURAL",
    moonBrightness: 0,
    forecastSource: "OPEN_METEO",
    hours: [],
    ...overrides,
  }
}
