import { describe, expect, it } from "vitest"
import { makeHours, makePlace, recordedNight } from "./__fixtures__"
import {
  average,
  clearRuns,
  hourAt,
  hourIndexAtFraction,
  hourTimeline,
  initialTimelineTime,
  moonSummary,
  moonUpRange,
  preferBeforeIndex,
  windowHours,
  windowIndexRange,
} from "./hours"

describe("고른 시각의 칸 찾기", () => {
  const hours = makeHours([{ cloudCover: 10 }, { cloudCover: 20 }, { cloudCover: 30 }])

  it("같은 시각의 칸을 준다", () => {
    expect(hourAt(hours, "2026-11-24T19:00:00+09:00")?.cloudCover).toBe(20)
  })

  it("표기가 달라도 같은 순간이면 찾는다", () => {
    expect(hourAt(hours, "2026-11-24T10:00:00Z")?.cloudCover).toBe(20)
  })

  it("예보가 없는 시각은 지어내지 않는다", () => {
    expect(hourAt(hours, "2026-11-24T17:00:00+09:00")).toBeUndefined()
    expect(hourAt(hours, "2026-11-24T19:30:00+09:00")).toBeUndefined()
    expect(hourAt([], "2026-11-24T19:00:00+09:00")).toBeUndefined()
  })
})

describe("띠 위의 위치를 칸으로", () => {
  it("칸의 경계에서 다음 칸으로 넘어간다", () => {
    expect(hourIndexAtFraction(0, 13)).toBe(0)
    expect(hourIndexAtFraction(0.0769, 13)).toBe(0)
    expect(hourIndexAtFraction(1 / 13 + 0.0001, 13)).toBe(1)
    expect(hourIndexAtFraction(0.5, 13)).toBe(6)
    expect(hourIndexAtFraction(0.999, 13)).toBe(12)
  })

  it("띠를 벗어나면 양 끝 칸이다", () => {
    expect(hourIndexAtFraction(-0.2, 13)).toBe(0)
    expect(hourIndexAtFraction(1, 13)).toBe(12)
    expect(hourIndexAtFraction(1.4, 13)).toBe(12)
  })

  it("칸이 없으면 -1", () => {
    expect(hourIndexAtFraction(0.5, 0)).toBe(-1)
  })
})

describe("시간 슬라이더의 눈금", () => {
  it("장소마다 범위가 달라도 합쳐서 시간순으로 늘어놓는다", () => {
    const west = makePlace({ id: 1, hours: makeHours([{}, {}, {}], 18) })
    const east = makePlace({ id: 2, hours: makeHours([{}, {}, {}], 17) })
    expect(hourTimeline([west, east]).map((time) => time.slice(11, 13))).toEqual(["17", "18", "19", "20"])
  })

  it("처음에는 추천 시간의 시작을 가리킨다", () => {
    const night = recordedNight()
    const timeline = hourTimeline(night.places)
    expect(timeline).toHaveLength(13)
    expect(initialTimelineTime(timeline, night.places[0])).toBe("2026-11-24T19:00:00+09:00")
  })

  it("추천 시간이 없으면 첫 어두운 칸, 장소가 없으면 첫 칸이다", () => {
    const night = recordedNight()
    const timeline = hourTimeline(night.places)
    const cloudy = night.places[3]
    expect(cloudy.bestWindow).toBeUndefined()
    expect(initialTimelineTime(timeline, cloudy)).toBe("2026-11-24T19:00:00+09:00")
    expect(initialTimelineTime(timeline, undefined)).toBe("2026-11-24T18:00:00+09:00")
    expect(initialTimelineTime([], cloudy)).toBeUndefined()
  })
})

describe("추천 시간대의 칸", () => {
  const hours = makeHours([{ cloudCover: 0 }, { cloudCover: 10 }, { cloudCover: 20 }, { cloudCover: 90 }])
  const window = { start: "2026-11-24T19:00:00+09:00", end: "2026-11-24T21:00:00+09:00", hours: 2 }

  it("시작은 포함하고 끝은 포함하지 않는다", () => {
    expect(windowHours(hours, window).map((hour) => hour.cloudCover)).toEqual([10, 20])
    expect(windowIndexRange(hours, window)).toEqual([1, 2])
  })

  it("추천 시간이 없으면 비어 있다", () => {
    expect(windowHours(hours, undefined)).toEqual([])
    expect(windowIndexRange(hours, undefined)).toBeNull()
  })

  it("평균은 반올림하고, 칸이 없으면 null이다", () => {
    expect(average(windowHours(hours, window), (hour) => hour.cloudCover)).toBe(15)
    expect(average(hours.slice(0, 2), (hour) => hour.cloudCover)).toBe(5)
    expect(average([], (hour) => hour.cloudCover)).toBeNull()
  })

  it("기록 응답: 흐렸다 갠 밤의 추천 시간은 6시간이다", () => {
    const place = recordedNight().places[1]
    const inWindow = windowHours(place.hours, place.bestWindow)
    expect(inWindow).toHaveLength(6)
    expect(inWindow.every((hour) => hour.clear)).toBe(true)
  })
})

describe("맑은 구간", () => {
  it("맑은 칸이 이어진 구간을 시간순으로 준다", () => {
    const hours = makeHours([
      { dark: false },
      { clear: true },
      { clear: true },
      { clear: false },
      { clear: true },
      { clear: false },
    ])
    expect(clearRuns(hours)).toEqual([
      { start: "2026-11-24T19:00:00+09:00", end: "2026-11-24T21:00:00+09:00", hours: 2 },
      { start: "2026-11-24T22:00:00+09:00", end: "2026-11-24T23:00:00+09:00", hours: 1 },
    ])
  })

  it("마지막 칸까지 맑으면 그 칸의 끝에서 닫는다", () => {
    const hours = makeHours([{ clear: false }, { clear: true }, { clear: true }], 22)
    expect(clearRuns(hours)).toEqual([{ start: "2026-11-24T23:00:00+09:00", end: "2026-11-25T01:00:00+09:00", hours: 2 }])
  })

  it("맑은 칸이 없으면 구간도 없다", () => {
    expect(clearRuns(makeHours([{}, {}, {}]))).toEqual([])
    expect(clearRuns([])).toEqual([])
  })

  it("예보가 끊긴 자리에서는 구간을 잇지 않는다", () => {
    const [a, b, , d] = makeHours([{ clear: true }, { clear: true }, {}, { clear: true }])
    expect(clearRuns([a, b, d]).map((run) => run.hours)).toEqual([2, 1])
  })

  it("기록 응답: 흐렸다 갠 밤에는 구간이 둘이고 긴 쪽이 추천 시간이다", () => {
    const place = recordedNight().places[1]
    const runs = clearRuns(place.hours)
    expect(runs.map((run) => run.hours)).toEqual([6, 1])
    expect(runs[0]).toEqual(place.bestWindow)
  })
})

describe("달", () => {
  it("어두운 시간에 달이 없으면 달 없는 밤이다", () => {
    const hours = makeHours([{ dark: false, moonUp: true }, { moonUp: false }, { moonUp: false }])
    expect(moonSummary({ hours, notes: [] })).toEqual({ kind: "NO_MOON" })
  })

  it("서버가 달이 밝다고 알린 밤은 뜨고 지는 시각보다 그것을 먼저 말한다", () => {
    const hours = makeHours([{ moonUp: true }, { moonUp: false }])
    expect(moonSummary({ hours, notes: ["BRIGHT_MOON"] })).toEqual({ kind: "BRIGHT" })
  })

  it("일찍 지는 달은 어두워지는 시각을 준다", () => {
    const hours = makeHours([{ moonUp: true }, { moonUp: true }, { moonUp: false }, { moonUp: false }])
    expect(moonSummary({ hours, notes: [] })).toEqual({ kind: "SETS_EARLY", darkFrom: "2026-11-24T20:00:00+09:00" })
  })

  it("늦게 뜨는 달은 뜨는 시각을 준다", () => {
    const hours = makeHours([{ moonUp: false }, { moonUp: false }, { moonUp: true }])
    expect(moonSummary({ hours, notes: [] })).toEqual({ kind: "RISES_LATE", darkUntil: "2026-11-24T20:00:00+09:00" })
  })

  it("밤새 떠 있지만 서버가 밝다고 하지 않은 달", () => {
    const hours = makeHours([{ moonUp: true }, { moonUp: true }])
    expect(moonSummary({ hours, notes: [] })).toEqual({ kind: "UP_ALL_NIGHT" })
  })

  it("어두운 칸이 없으면 말하지 않는다", () => {
    expect(moonSummary({ hours: makeHours([{ dark: false }]), notes: [] })).toBeNull()
    expect(moonSummary({ hours: [], notes: [] })).toBeNull()
  })

  it("달이 떠 있는 칸의 범위", () => {
    expect(moonUpRange(makeHours([{}, { moonUp: true }, { moonUp: true }, {}]))).toEqual([1, 2])
    expect(moonUpRange(makeHours([{}, {}]))).toBeNull()
  })
})

describe("선호 시각의 위치", () => {
  // 18시부터 13칸: 18, 19, ..., 23, 0, 1, ..., 6
  const hours = makeHours(Array.from({ length: 13 }, () => ({})))

  it("새벽 시각은 다음 날로 읽는다", () => {
    expect(preferBeforeIndex(hours, "2026-11-24", "02:00")).toBe(8)
    expect(preferBeforeIndex(hours, "2026-11-24", "00:00")).toBe(6)
  })

  it("저녁 시각은 그날로 읽는다", () => {
    expect(preferBeforeIndex(hours, "2026-11-24", "22:00")).toBe(4)
  })

  it("밤 밖에 놓이면 선을 긋지 않는다", () => {
    expect(preferBeforeIndex(hours, "2026-11-24", "11:59")).toBeNull()
    expect(preferBeforeIndex(hours, "2026-11-24", "18:00")).toBeNull()
    expect(preferBeforeIndex([], "2026-11-24", "02:00")).toBeNull()
  })
})
