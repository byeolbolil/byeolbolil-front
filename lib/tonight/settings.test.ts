import { describe, expect, it } from "vitest"
import {
  DEFAULT_SETTINGS,
  originLabel,
  parseSettings,
  PREFER_ALL_NIGHT,
  resolveOrigin,
  roundCoordinate,
  toNightQuery,
  type Settings,
} from "./settings"

const seoulMapo = { lat: 37.5512345, lon: 126.9098765 }

describe("저장된 설정 읽기", () => {
  it("값이 없거나 모양이 다르면 기본값이다", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings("x")).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it("아는 값은 그대로 읽는다", () => {
    const saved: Settings = {
      preferBefore: "all",
      maxTravelMinutes: null,
      minClearHours: 5,
      redScreen: true,
      origin: { kind: "place", name: "양평군", lat: 37.4916, lon: 127.4875 },
    }
    expect(parseSettings(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
  })

  it("예전에 이름으로만 저장한 도시는 좌표가 있는 출발 위치로 바꿔 읽는다", () => {
    expect(parseSettings({ origin: { kind: "city", name: "부산" } }).origin).toEqual({
      kind: "place",
      name: "부산",
      lat: 35.097,
      lon: 129.008,
    })
  })

  it("직접 고른 출발 위치는 이름과 범위 안의 좌표가 모두 있어야 읽는다", () => {
    const origin = (value: unknown) => parseSettings({ origin: value }).origin
    expect(origin({ kind: "place", name: "양평군", lat: 37.4916 })).toEqual({ kind: "gps" })
    expect(origin({ kind: "place", name: " ", lat: 37.4916, lon: 127.4875 })).toEqual({ kind: "gps" })
    expect(origin({ kind: "place", name: "양평군", lat: 91, lon: 127.4875 })).toEqual({ kind: "gps" })
    expect(origin({ kind: "place", name: "양평군", lat: "37.4916", lon: 127.4875 })).toEqual({ kind: "gps" })
  })

  it("모르는 값과 범위를 벗어난 값은 기본값으로 바꾼다", () => {
    const parsed = parseSettings({
      preferBefore: "04:00",
      maxTravelMinutes: 90,
      minClearHours: 9,
      redScreen: "yes",
      origin: { kind: "city", name: "평양" },
    })
    expect(parsed).toEqual(DEFAULT_SETTINGS)
  })

  it("맑은 시간 기준은 API가 받는 1~8의 정수만 받는다", () => {
    expect(parseSettings({ minClearHours: 1 }).minClearHours).toBe(1)
    expect(parseSettings({ minClearHours: 8 }).minClearHours).toBe(8)
    expect(parseSettings({ minClearHours: 0 }).minClearHours).toBe(3)
    expect(parseSettings({ minClearHours: 2.5 }).minClearHours).toBe(3)
  })
})

describe("출발 좌표 정하기", () => {
  it("현재 위치를 쓰기로 했지만 받지 못했으면 출발지가 없다", () => {
    expect(resolveOrigin({ kind: "gps" }, null)).toBeNull()
    expect(resolveOrigin({ kind: "gps" }, seoulMapo)).toEqual(seoulMapo)
  })

  it("직접 고른 곳이 있으면 현재 위치보다 그곳이 먼저다", () => {
    expect(resolveOrigin({ kind: "place", name: "강릉", lat: 37.756, lon: 128.896 }, seoulMapo)).toEqual({
      lat: 37.756,
      lon: 128.896,
    })
  })

  it("정하지 않으면 위치를 받았어도 쓰지 않는다", () => {
    expect(resolveOrigin({ kind: "none" }, seoulMapo)).toBeNull()
  })

  it("버튼 문구", () => {
    expect(originLabel({ kind: "gps" }, seoulMapo)).toBe("내 위치에서 출발")
    expect(originLabel({ kind: "gps" }, seoulMapo, "서울특별시 성산2동")).toBe("내 위치 · 서울특별시 성산2동")
    expect(originLabel({ kind: "gps" }, null)).toBe("출발 위치 정하기")
    expect(originLabel({ kind: "place", name: "대전", lat: 36.337, lon: 127.423 }, null)).toBe("대전에서 출발")
    expect(originLabel({ kind: "none" }, seoulMapo)).toBe("출발 위치 정하기")
  })
})

describe("설정을 API 쿼리로", () => {
  it("기본 설정과 출발지", () => {
    expect(toNightQuery(DEFAULT_SETTINGS, seoulMapo)).toEqual({
      lat: 37.55,
      lon: 126.91,
      minClearHours: 3,
      preferBefore: "02:00",
      maxTravelMinutes: 180,
    })
  })

  it("출발지가 없으면 좌표도 이동 시간 한도도 보내지 않는다", () => {
    expect(toNightQuery(DEFAULT_SETTINGS, null)).toEqual({ minClearHours: 3, preferBefore: "02:00" })
  })

  it("몇 시까지: 고른 시각을 그대로 보낸다", () => {
    expect(toNightQuery({ ...DEFAULT_SETTINGS, preferBefore: "00:00" }, null).preferBefore).toBe("00:00")
    expect(toNightQuery({ ...DEFAULT_SETTINGS, preferBefore: "03:00" }, null).preferBefore).toBe("03:00")
  })

  it("몇 시까지: 밤새는 다음 날 정오 직전으로 보낸다", () => {
    expect(toNightQuery({ ...DEFAULT_SETTINGS, preferBefore: "all" }, null).preferBefore).toBe(PREFER_ALL_NIGHT)
    expect(PREFER_ALL_NIGHT < "12:00").toBe(true)
  })

  it("얼마나 멀리: 상관없으면 한도를 보내지 않는다", () => {
    const query = toNightQuery({ ...DEFAULT_SETTINGS, maxTravelMinutes: null }, seoulMapo)
    expect(query.maxTravelMinutes).toBeUndefined()
    expect(query.lat).toBe(37.55)
    expect(toNightQuery({ ...DEFAULT_SETTINGS, maxTravelMinutes: 60 }, seoulMapo).maxTravelMinutes).toBe(60)
  })

  it("맑은 시간 기준을 보낸다", () => {
    expect(toNightQuery({ ...DEFAULT_SETTINGS, minClearHours: 5 }, null).minClearHours).toBe(5)
  })

  it("적색 화면은 쿼리에 들어가지 않는다", () => {
    const base = toNightQuery(DEFAULT_SETTINGS, seoulMapo)
    expect(toNightQuery({ ...DEFAULT_SETTINGS, redScreen: true }, seoulMapo)).toEqual(base)
  })

  it("좌표는 소수 둘째 자리까지만 보낸다", () => {
    expect(roundCoordinate(37.5512345)).toBe(37.55)
    expect(roundCoordinate(126.9098765)).toBe(126.91)
    expect(roundCoordinate(33.005)).toBe(33.01)
  })
})
