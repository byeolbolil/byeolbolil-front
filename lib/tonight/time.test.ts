import { describe, expect, it } from "vitest"
import {
  addDays,
  shortNightLabel,
  daysBetween,
  hourOf,
  issuedAtText,
  koreanClock,
  koreanHour,
  nightDates,
  nightName,
  nightTabLabel,
  shortDate,
  weekdayOf,
  windowText,
} from "./time"

describe("koreanHour", () => {
  it.each([
    [0, "자정"],
    [1, "새벽 1시"],
    [5, "새벽 5시"],
    [6, "아침 6시"],
    [11, "아침 11시"],
    [12, "낮 12시"],
    [13, "오후 1시"],
    [16, "오후 4시"],
    [17, "저녁 5시"],
    [20, "저녁 8시"],
    [21, "밤 9시"],
    [23, "밤 11시"],
    [24, "자정"],
    [-1, "밤 11시"],
  ])("%i시는 %s", (hour, text) => {
    expect(koreanHour(hour)).toBe(text)
  })
})

describe("시각 문자열 읽기", () => {
  it("브라우저 시간대와 상관없이 문자열에 적힌 시를 읽는다", () => {
    expect(hourOf("2026-11-24T19:00:00+09:00")).toBe(19)
    expect(hourOf("2026-11-25T00:00:00+09:00")).toBe(0)
  })

  it("추천 시간대를 시작과 끝으로 적는다", () => {
    expect(windowText({ start: "2026-11-24T19:00:00+09:00", end: "2026-11-25T02:00:00+09:00" })).toBe(
      "저녁 7시 – 새벽 2시",
    )
    expect(windowText({ start: "2026-11-24T22:00:00+09:00", end: "2026-11-25T00:00:00+09:00" })).toBe("밤 10시 – 자정")
  })

  it("HH:mm을 읽는다", () => {
    expect(koreanClock("02:00")).toBe("새벽 2시")
    expect(koreanClock("00:00")).toBe("자정")
    expect(koreanClock("01:30")).toBe("새벽 1시 30분")
  })

  it("예보 생성 시각을 날짜와 함께 적는다", () => {
    expect(issuedAtText("2026-11-23T21:00:00+09:00")).toBe("11/23 밤 9시")
  })
})

describe("날짜 계산", () => {
  it("달과 해를 넘겨 더한다", () => {
    expect(addDays("2026-11-24", 1)).toBe("2026-11-25")
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
  })

  it("일수 차이를 센다", () => {
    expect(daysBetween("2026-11-24", "2026-11-24")).toBe(0)
    expect(daysBetween("2026-11-24", "2026-12-01")).toBe(7)
    expect(daysBetween("2026-11-24", "2026-11-23")).toBe(-1)
  })

  it("요일과 짧은 날짜", () => {
    expect(weekdayOf("2026-11-24")).toBe("화요일")
    expect(weekdayOf("2026-11-29")).toBe("일요일")
    expect(shortDate("2026-11-04")).toBe("11/4")
  })

  it("오늘 밤부터 7일을 늘어놓는다", () => {
    const dates = nightDates("2026-11-28")
    expect(dates).toHaveLength(7)
    expect(dates[0]).toBe("2026-11-28")
    expect(dates[6]).toBe("2026-12-04")
  })
})

describe("밤의 이름", () => {
  const tonight = "2026-11-24"

  it("오늘과 내일은 이름이 따로 있고 그 뒤는 요일이다", () => {
    expect(nightName("2026-11-24", tonight)).toBe("오늘 밤")
    expect(nightName("2026-11-25", tonight)).toBe("내일 밤")
    expect(nightName("2026-11-26", tonight)).toBe("목요일 밤")
    expect(nightTabLabel("2026-11-26", tonight)).toBe("목요일")
    expect(nightTabLabel("2026-11-24", tonight)).toBe("오늘 밤")
  })
})

describe("좁은 칸의 밤 이름", () => {
  it("오늘과 내일은 그대로, 그 뒤는 요일의 첫 글자다", () => {
    expect(shortNightLabel("2026-11-27", "2026-11-27")).toBe("오늘")
    expect(shortNightLabel("2026-11-28", "2026-11-27")).toBe("내일")
    expect(shortNightLabel("2026-11-29", "2026-11-27")).toBe("일")
    expect(shortNightLabel("2026-11-30", "2026-11-27")).toBe("월")
  })
})
