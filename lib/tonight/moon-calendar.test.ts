import { describe, expect, it } from "vitest"
import { moonUrl, unwrapMoon, type MoonCalendarNight } from "./api"
import { calendarNightName, calendarWeeks, durationText, moonlessShare, moonlessSpansText } from "./moon-calendar"

const night = (date: string, moonlessMinutes = 0, dark?: { start: string; end: string }): MoonCalendarNight => ({
  date,
  moon: { illuminatedFraction: 0.5, waxing: true },
  moonless: [],
  moonlessMinutes,
  ...(dark ? { dark } : {}),
})

describe("달력 응답", () => {
  it("좌표를 소수 다섯째 자리까지 보낸다", () => {
    expect(moonUrl({ lat: 37.566512345, lon: 126.978 })).toBe("/api/v1/recommendations/moon?lat=37.56651&lon=126.97800")
  })

  it("밤의 값을 그대로 받고, 없는 시각과 어둠은 빼 둔다", () => {
    const body = {
      success: true,
      data: {
        startDate: "2026-11-09",
        nights: [
          {
            date: "2026-11-09",
            moon: { illuminatedFraction: 0, waxing: true, set: "2026-11-09T16:59:00+09:00" },
            dark: { start: "2026-11-09T18:25:00+09:00", end: "2026-11-10T06:07:00+09:00" },
            moonless: [{ start: "2026-11-09T18:25:00+09:00", end: "2026-11-10T06:07:00+09:00" }],
            moonlessMinutes: 702,
          },
          { date: "2026-11-10", moon: { illuminatedFraction: 0.02, waxing: true }, moonless: [], moonlessMinutes: 0 },
        ],
      },
    }
    const calendar = unwrapMoon(body)
    expect(calendar.startDate).toBe("2026-11-09")
    expect(calendar.nights[0]).toEqual(body.data.nights[0])
    expect(calendar.nights[1]).toEqual({
      date: "2026-11-10",
      moon: { illuminatedFraction: 0.02, waxing: true },
      moonless: [],
      moonlessMinutes: 0,
    })
  })

  it("달 모양이 없는 밤은 그릴 수 없어서 버린다", () => {
    const body = { success: true, data: { startDate: "2026-11-09", nights: [{ date: "2026-11-09", moonless: [] }] } }
    expect(unwrapMoon(body).nights).toEqual([])
  })

  it("봉투가 아니면 받지 않는다", () => {
    expect(() => unwrapMoon({ data: {} })).toThrow()
  })
})

describe("달력 칸", () => {
  it("일요일부터 시작하는 주로 나누고, 첫 밤 앞과 마지막 밤 뒤를 빈 칸으로 채운다", () => {
    // 2026-11-27은 금요일이다
    const weeks = calendarWeeks([night("2026-11-27"), night("2026-11-28"), night("2026-11-29")])
    expect(weeks).toHaveLength(2)
    expect(weeks[0].map((cell) => cell?.date ?? null)).toEqual([null, null, null, null, null, "2026-11-27", "2026-11-28"])
    expect(weeks[1].map((cell) => cell?.date ?? null)).toEqual(["2026-11-29", null, null, null, null, null, null])
  })

  it("밤이 없으면 줄도 없다", () => {
    expect(calendarWeeks([])).toEqual([])
  })

  it("막대는 가장 긴 어두운 밤에 견준 달 없는 시간이다", () => {
    const long = night("2026-12-09", 600, { start: "2026-12-09T18:00:00+09:00", end: "2026-12-10T06:00:00+09:00" })
    const half = night("2026-12-10", 360, { start: "2026-12-10T18:00:00+09:00", end: "2026-12-11T06:00:00+09:00" })
    const none = night("2026-12-11", 0)
    const nights = [long, half, none]
    expect(moonlessShare(long, nights)).toBeCloseTo(600 / 720)
    expect(moonlessShare(half, nights)).toBeCloseTo(0.5)
    expect(moonlessShare(none, nights)).toBe(0)
  })

  it("어두운 밤이 하나도 없으면 막대는 비어 있다", () => {
    expect(moonlessShare(night("2026-12-09", 0), [night("2026-12-09", 0)])).toBe(0)
  })
})

describe("달력 문구", () => {
  it("분을 시간과 분으로 읽는다", () => {
    expect(durationText(680)).toBe("11시간 20분")
    expect(durationText(120)).toBe("2시간")
    expect(durationText(40)).toBe("40분")
    expect(durationText(0)).toBe("")
  })

  it("달 없는 구간을 구간마다 한 줄로 적는다", () => {
    expect(
      moonlessSpansText({
        moonless: [
          { start: "2026-12-01T18:15:00+09:00", end: "2026-12-02T00:36:00+09:00" },
          { start: "2026-12-02T04:40:00+09:00", end: "2026-12-02T06:27:00+09:00" },
        ],
      }),
    ).toEqual(["저녁 6시 15분 – 밤 12시 36분", "새벽 4시 40분 – 아침 6시 27분"])
  })

  it("오늘 밤과 내일 밤은 그렇게 부르고, 그 뒤는 날짜와 요일로 부른다", () => {
    expect(calendarNightName("2026-11-27", "2026-11-27")).toBe("오늘 밤")
    expect(calendarNightName("2026-11-28", "2026-11-27")).toBe("내일 밤")
    expect(calendarNightName("2026-12-12", "2026-11-27")).toBe("12월 12일 토요일 밤")
  })
})
