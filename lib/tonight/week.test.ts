import { describe, expect, it } from "vitest"
import { recordedNight } from "./__fixtures__"
import { bestNight, dayLabel, myWeekUrl, nightPlaceOf, unwrapWeek, WeekApiError, weekSummary, weekUrl, type WeekNight } from "./week"

function night(date: string, level: WeekNight["level"], hours = 0): WeekNight {
  return {
    date,
    level,
    pattern: level === "NO" ? "CLOUDY_ALL_NIGHT" : "CLEAR_ALL_NIGHT",
    notes: [],
    bestWindow: hours ? { start: `${date}T19:00:00+09:00`, end: `${date}T23:00:00+09:00`, hours } : undefined,
    moonBrightness: 0,
    hours: [],
  }
}

function envelope(data: unknown) {
  return { success: true, status: 200, message: "요청이 성공적으로 처리되었습니다.", data }
}

describe("weekUrl", () => {
  it("좌표를 소수 다섯째 자리까지 보내고 기준이 있으면 붙인다", () => {
    expect(weekUrl({ lat: 37.626334567, lon: 128.7394 })).toBe("/api/v1/recommendations/week?lat=37.62633&lon=128.73940")
    expect(weekUrl({ lat: 37.5, lon: 127 }, { minClearHours: 4, preferBefore: "23:00" })).toBe(
      "/api/v1/recommendations/week?lat=37.50000&lon=127.00000&minClearHours=4&preferBefore=23%3A00",
    )
  })
})

describe("myWeekUrl", () => {
  it("기준이 없으면 쿼리를 붙이지 않는다", () => {
    expect(myWeekUrl()).toBe("/api/v1/recommendations/week/mine")
    expect(myWeekUrl({ minClearHours: 2 })).toBe("/api/v1/recommendations/week/mine?minClearHours=2")
  })
})

describe("unwrapWeek", () => {
  const place = {
    type: "BOOKMARK",
    id: 7,
    name: "우리집 옥상",
    latitude: 37.55,
    longitude: 126.91,
    skyBrightness: 67.7,
    skyClass: "URBAN",
    bortleClass: 9,
    nights: [night("2026-11-25", "MAYBE", 3), { date: 3 }, null],
  }

  it("날짜와 장소를 꺼내고 모양이 다른 밤은 버린다", () => {
    const week = unwrapWeek(envelope({ startDate: "2026-11-25", dates: ["2026-11-25", "2026-11-26"], places: [place] }))

    expect(week.startDate).toBe("2026-11-25")
    expect(week.dates).toEqual(["2026-11-25", "2026-11-26"])
    expect(week.places).toHaveLength(1)
    expect(week.places[0].name).toBe("우리집 옥상")
    expect(week.places[0].nights.map((item) => item.date)).toEqual(["2026-11-25"])
  })

  it("예보를 받지 못한 장소는 밤이 없는 채로 남긴다", () => {
    const week = unwrapWeek(envelope({ startDate: "2026-11-25", dates: [], places: [{ ...place, nights: undefined }] }))

    expect(week.places[0].nights).toEqual([])
  })

  it("좌표가 없는 장소는 버리고, 봉투의 모양이 다르면 받지 않는다", () => {
    const week = unwrapWeek(envelope({ startDate: "2026-11-25", dates: [], places: [{ ...place, latitude: undefined }] }))

    expect(week.places).toEqual([])
    expect(() => unwrapWeek({ success: false })).toThrow(WeekApiError)
    expect(() => unwrapWeek(envelope({ startDate: "2026-11-25", places: [] }))).toThrow(WeekApiError)
  })
})

describe("dayLabel", () => {
  it("오늘과 내일은 그대로, 그 뒤는 요일 한 글자로 적는다", () => {
    expect(dayLabel("2026-11-25", "2026-11-25")).toBe("오늘")
    expect(dayLabel("2026-11-26", "2026-11-25")).toBe("내일")
    expect(dayLabel("2026-11-27", "2026-11-25")).toBe("금")
    expect(dayLabel("2026-11-29", "2026-11-25")).toBe("일")
  })
})

describe("bestNight", () => {
  it("등급이 가장 높은 밤을 고른다", () => {
    const nights = [night("2026-11-25", "GOOD", 5), night("2026-11-26", "NO"), night("2026-11-27", "STRONG", 4)]

    expect(bestNight(nights)?.date).toBe("2026-11-27")
  })

  it("등급이 같으면 추천 시간이 긴 밤, 그것도 같으면 가까운 밤이다", () => {
    expect(bestNight([night("2026-11-25", "GOOD", 3), night("2026-11-26", "GOOD", 6)])?.date).toBe("2026-11-26")
    expect(bestNight([night("2026-11-25", "STRONG", 6), night("2026-11-26", "STRONG", 6)])?.date).toBe("2026-11-25")
  })

  it("별 보기 좋아요에 못 미치는 밤뿐이면 없다", () => {
    expect(bestNight([night("2026-11-25", "MAYBE", 2), night("2026-11-26", "NO")])).toBeNull()
    expect(bestNight([])).toBeNull()
  })
})

describe("weekSummary", () => {
  it("가장 좋은 밤의 이름을 적고, 좋은 밤이 여럿이면 몇 번인지 덧붙인다", () => {
    const nights = [night("2026-11-25", "NO"), night("2026-11-26", "GOOD", 4), night("2026-11-27", "STRONG", 5)]

    expect(weekSummary(nights, "2026-11-25")).toBe("금요일 밤이 가장 좋아요. 좋은 밤이 2번 있어요")
    expect(weekSummary([night("2026-11-25", "STRONG", 5)], "2026-11-25")).toBe("오늘 밤이 가장 좋아요")
    expect(weekSummary([night("2026-11-25", "NO"), night("2026-11-26", "GOOD", 4)], "2026-11-25")).toBe("내일 밤이 가장 좋아요")
  })

  it("좋은 밤이 없거나 예보가 없으면 그렇게 적는다", () => {
    expect(weekSummary([night("2026-11-25", "MAYBE", 2)], "2026-11-25")).toBe("이번 주는 별 보기 좋은 밤이 없어요")
    expect(weekSummary([], "2026-11-25")).toBe("예보를 받지 못했어요")
  })
})

describe("내 장소를 장소 화면에 넘길 값", () => {
  const weekPlace = (overrides = {}) => ({
    id: 7,
    name: "우리집 옥상",
    address: "강원 평창",
    latitude: 37.6,
    longitude: 128.4,
    skyBrightness: 2.5,
    skyClass: "RURAL" as const,
    skyRank: 14,
    forecastSource: "OPEN_METEO" as const,
    nights: [
      { date: "2026-11-24", level: "GOOD" as const, pattern: "CLEAR_ALL_NIGHT" as const, notes: [], moonBrightness: 0.1, hours: [] },
    ],
    ...overrides,
  })

  it("그 밤의 추천에 들어 있으면 그 항목을 그대로 쓴다", () => {
    const night = recordedNight()
    const listed = { ...night.places[0], type: "BOOKMARK" as const, id: 7 }
    const withMine = { ...night, places: [listed, ...night.places.slice(1)] }
    expect(nightPlaceOf(weekPlace(), withMine)).toBe(listed)
  })

  it("추천에 없으면(이동 시간 한도 밖) 이번 주의 그 밤으로 만든다", () => {
    const night = { ...recordedNight(), date: "2026-11-24" }
    const made = nightPlaceOf(weekPlace(), night)
    expect(made).toMatchObject({ type: "BOOKMARK", id: 7, name: "우리집 옥상", level: "GOOD", skyRank: 14, latitude: 37.6 })
  })

  it("그 밤의 예보가 없으면 별 보기 어려운 밤으로 둔다", () => {
    const night = { ...recordedNight(), date: "2026-11-30" }
    expect(nightPlaceOf(weekPlace(), night)).toMatchObject({ level: "NO", hours: [] })
  })
})
