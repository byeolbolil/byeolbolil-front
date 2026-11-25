import { describe, expect, it } from "vitest"
import { makeHours, makePlace, recordedNight } from "./__fixtures__"
import {
  buildNightView,
  cloudFact,
  emptyMessage,
  forecastCredits,
  levelReason,
  moonFact,
  skyFact,
  tipText,
  windowCloudAverage,
} from "./facts"
import type { NightRecommendation } from "./types"

function nightOf(overrides: Partial<NightRecommendation>): NightRecommendation {
  return {
    date: "2026-11-24",
    criteria: { minClearHours: 3, preferBefore: "02:00" },
    candidateCount: 0,
    evaluatedCount: 0,
    excludedByTravelCount: 0,
    places: [],
    ...overrides,
  }
}

describe("첫 화면 구성", () => {
  it("기록 응답: 첫 장소가 가장 좋은 곳이고 나머지는 순서대로 남는다", () => {
    const night = recordedNight()
    const view = buildNightView(night)
    expect(view.top?.name).toBe("양구 국토정중앙천문대")
    expect(view.rest.map((place) => place.level)).toEqual(["GOOD", "MAYBE", "NO"])
    expect(view.empty).toBeNull()
  })

  it("가볼 만한 곳이 없으면 쉬어가라는 곳을 빼고 보여준다", () => {
    const night = recordedNight()
    const view = buildNightView({ ...night, places: night.places.slice(2) })
    expect(view.top).toBeNull()
    expect(view.rest.map((place) => place.level)).toEqual(["MAYBE"])
    expect(view.empty).toBe("POOR")
  })

  it("모두 흐리면 전국 흐림이다", () => {
    const night = recordedNight()
    const view = buildNightView({ ...night, places: night.places.slice(3) })
    expect(view.top).toBeNull()
    expect(view.rest).toEqual([])
    expect(view.empty).toBe("CLOUDY")
  })

  it("이동 시간 한도로 모두 빠진 경우와 예보를 받지 못한 경우를 구분한다", () => {
    expect(buildNightView(nightOf({ candidateCount: 64, evaluatedCount: 64, excludedByTravelCount: 64 })).empty).toBe(
      "ALL_EXCLUDED",
    )
    expect(buildNightView(nightOf({ candidateCount: 64, evaluatedCount: 0 })).empty).toBe("NO_FORECAST")
  })

  it("빈 밤의 문구에 이동 시간 한도를 넣는다", () => {
    expect(emptyMessage("CLOUDY", 3)).toEqual({
      title: "구름이 많은 밤이에요",
      detail: "3시간 안에 갈 수 있는 곳이 모두 흐려요",
    })
    expect(emptyMessage("CLOUDY", null).detail).toBe("갈 수 있는 곳이 모두 흐려요")
    expect(emptyMessage("POOR", 1).detail).toBe("1시간 안에 갈 수 있는 곳 중에 가볼 만한 곳이 없어요")
  })
})

describe("짧은 설명", () => {
  it("기록 응답: 구름 없이 밤새 맑은 곳", () => {
    const place = recordedNight().places[0]
    expect(windowCloudAverage(place)).toBe(0)
    expect(cloudFact(place)).toEqual({ title: "구름 거의 없음", detail: "밤새 맑아요" })
    expect(moonFact(place)).toEqual({ title: "달이 밝아요", detail: "희미한 별은 잘 안 보여요" })
    expect(skyFact(place)).toEqual({ title: "진짜 어두운 하늘", detail: "달빛 때문에 오늘은 별이 줄어요" })
  })

  it("기록 응답: 밤새 흐린 곳은 추천 시간이 없다", () => {
    const place = recordedNight().places[3]
    expect(windowCloudAverage(place)).toBeNull()
    expect(cloudFact(place)).toEqual({ title: "구름이 두꺼워요", detail: "밤새 흐려요" })
  })

  it("달이 밝지 않으면 광해 등급을 적는다", () => {
    expect(skyFact(makePlace({ bortleClass: 3 }))).toEqual({ title: "시골 하늘", detail: "광해 9등급 중 3등급이에요" })
  })

  it("달이 지는 시각과 뜨는 시각", () => {
    const setsEarly = makePlace({ hours: makeHours([{ moonUp: true }, { moonUp: false }, { moonUp: false }], 19) })
    expect(moonFact(setsEarly)).toEqual({ title: "달이 일찍 져요", detail: "저녁 8시부터 어두워요" })
    const risesLate = makePlace({ hours: makeHours([{ moonUp: false }, { moonUp: false }, { moonUp: true }], 23) })
    expect(moonFact(risesLate)).toEqual({ title: "달이 늦게 떠요", detail: "새벽 1시까지 어두워요" })
  })

  it("밤새 떠 있는 달은 API가 준 밝기를 적는다", () => {
    const place = makePlace({ moonBrightness: 0.09, hours: makeHours([{ moonUp: true }, { moonUp: true }]) })
    expect(moonFact(place)).toEqual({ title: "달이 밤새 떠 있어요", detail: "보름달 밝기의 9%예요" })
  })

  it("어두운 칸이 없으면 달 설명이 없다", () => {
    expect(moonFact(makePlace({ hours: [] }))).toBeNull()
  })
})

describe("한마디", () => {
  const window = { start: "2026-11-24T19:00:00+09:00", end: "2026-11-24T22:00:00+09:00", hours: 3 }
  const adapt = "도착하면 휴대폰 화면을 끄고 30분쯤 기다려 보세요. 눈이 어둠에 완전히 익는 데는 40분쯤 걸려요."

  it("추천 시간이 없으면 쉬라고 한다", () => {
    expect(tipText(makePlace({ level: "NO" }))).toBe("오늘은 쉬고, 맑은 날을 기다려 보세요.")
  })

  it("주의 사항이 없으면 어둠 적응만 안내한다", () => {
    expect(tipText(makePlace({ bestWindow: window }))).toBe(adapt)
  })

  it("달이 밝은 밤은 달을 보라고 한다", () => {
    expect(tipText(makePlace({ bestWindow: window, notes: ["BRIGHT_MOON", "CITY_LIGHTS"] }))).toBe(
      `달이 밝은 날이라 은하수는 어렵지만, 달 표면을 쌍안경으로 보면 크레이터까지 보여요. ${adapt}`,
    )
  })

  it("도시 불빛과 이슬", () => {
    expect(tipText(makePlace({ bestWindow: window, notes: ["CITY_LIGHTS", "DEW"] }))).toBe(
      `도시 불빛이 있어도 밝은 별자리는 충분히 보여요. 습도가 높아서 렌즈에 이슬이 맺힐 수 있어요. ${adapt}`,
    )
  })
})

describe("등급의 이유", () => {
  const window = { start: "2026-11-24T19:00:00+09:00", end: "2026-11-25T06:00:00+09:00", hours: 11 }

  it("가장 좋은 등급은 맑은 시간이 얼마나 이어지는지 말한다", () => {
    expect(levelReason(makePlace({ level: "STRONG", bestWindow: window, notes: [] }))).toBe("맑은 시간이 11시간 이어져요")
  })

  it("등급을 낮춘 사정이 있으면 맑은 시간 뒤에 잇는다", () => {
    expect(levelReason(makePlace({ level: "GOOD", bestWindow: window, notes: ["BRIGHT_MOON"] }))).toBe("11시간 맑지만 달이 밝아요")
    expect(levelReason(makePlace({ level: "MAYBE", bestWindow: window, notes: ["BRIGHT_MOON", "CITY_LIGHTS"] }))).toBe(
      "11시간 맑지만 달이 밝아요, 도시 불빛이 강해요",
    )
  })

  it("늦게 개는 밤은 맑아지는 시각을 먼저 말한다", () => {
    const late = { start: "2026-11-25T03:00:00+09:00", end: "2026-11-25T06:00:00+09:00", hours: 3 }
    expect(levelReason(makePlace({ level: "GOOD", bestWindow: late, notes: ["CLEARS_LATE"] }))).toBe("새벽 3시에야 맑아져요")
    expect(levelReason(makePlace({ level: "MAYBE", bestWindow: late, notes: ["CLEARS_LATE", "BRIGHT_MOON"] }))).toBe(
      "새벽 3시에야 맑아져요. 달이 밝아요",
    )
  })

  it("사정이 따로 없는데 등급이 낮으면 맑은 시간이 짧은 것이다", () => {
    const short = { start: "2026-11-24T22:00:00+09:00", end: "2026-11-25T00:00:00+09:00", hours: 2 }
    expect(levelReason(makePlace({ level: "MAYBE", bestWindow: short, notes: [] }))).toBe("맑은 시간이 2시간뿐이에요")
  })

  it("추천 시간이 없는 밤은 구름 때문이다", () => {
    expect(levelReason(makePlace({ level: "NO", bestWindow: undefined, pattern: "CLOUDY_ALL_NIGHT", notes: [] }))).toBe("밤새 구름이 많아요")
    expect(levelReason(makePlace({ level: "NO", bestWindow: undefined, pattern: "BRIEF_CLEAR", notes: [] }))).toBe(
      "어두운 시간에 맑은 틈이 이어지지 않아요",
    )
  })
})

describe("예보 출처", () => {
  it("기록 응답: 모두 Open-Meteo이고 생성 시각이 같다", () => {
    expect(forecastCredits(recordedNight().places)).toEqual([
      { source: "OPEN_METEO", issuedAt: "2026-11-23T21:00:00+09:00" },
    ])
  })

  it("출처가 섞이면 많이 쓰인 것부터, 출처마다 가장 최근 시각을 적는다", () => {
    const credits = forecastCredits([
      { forecastSource: "MET_NORWAY" },
      { forecastSource: "OPEN_METEO", forecastIssuedAt: "2026-11-23T21:00:00+09:00" },
      { forecastSource: "OPEN_METEO", forecastIssuedAt: "2026-11-24T03:00:00+09:00" },
    ])
    expect(credits).toEqual([
      { source: "OPEN_METEO", issuedAt: "2026-11-24T03:00:00+09:00" },
      { source: "MET_NORWAY" },
    ])
  })

  it("장소가 없으면 출처도 없다", () => {
    expect(forecastCredits([])).toEqual([])
  })
})
