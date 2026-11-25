import { describe, expect, it } from "vitest"
import { koreanTime, moonLitPath, moonPhaseName, moonTimesText } from "./moon"

describe("달의 밝은 면 그리기", () => {
  it("차오르는 달은 오른쪽 반원을 돈다", () => {
    // 위(10,0)에서 시계 방향으로 아래(10,20)까지
    expect(moonLitPath(10, 10, 10, 0.5, true)).toBe("M10,0 A10,10 0 0 1 10,20 A0.00,10 0 0 1 10,0 Z")
  })

  it("기우는 달은 왼쪽 반원을 돈다", () => {
    expect(moonLitPath(10, 10, 10, 0.5, false)).toBe("M10,0 A10,10 0 0 0 10,20 A0.00,10 0 0 0 10,0 Z")
  })

  it("초승달은 경계가 밝은 쪽으로 불룩해서 가는 눈썹 모양이 된다", () => {
    // 차오르는 달: 오른쪽이 밝고, 경계도 오른쪽으로 불룩하다(아래에서 오른쪽을 지나 위로, 반시계 방향)
    expect(moonLitPath(10, 10, 10, 0.25, true)).toBe("M10,0 A10,10 0 0 1 10,20 A5.00,10 0 0 0 10,0 Z")
    expect(moonLitPath(10, 10, 10, 0.25, false)).toBe("M10,0 A10,10 0 0 0 10,20 A5.00,10 0 0 1 10,0 Z")
  })

  it("반보다 더 찬 달은 경계가 어두운 쪽으로 불룩하다", () => {
    expect(moonLitPath(10, 10, 10, 0.75, true)).toBe("M10,0 A10,10 0 0 1 10,20 A5.00,10 0 0 1 10,0 Z")
    expect(moonLitPath(10, 10, 10, 0.75, false)).toBe("M10,0 A10,10 0 0 0 10,20 A5.00,10 0 0 0 10,0 Z")
  })

  it("보름달은 원 전체다", () => {
    expect(moonLitPath(10, 10, 10, 1, true)).toBe("M10,0 A10,10 0 0 1 10,20 A10.00,10 0 0 1 10,0 Z")
  })

  it("범위를 벗어난 값은 0과 1로 자른다", () => {
    expect(moonLitPath(10, 10, 10, 1.4, true)).toBe(moonLitPath(10, 10, 10, 1, true))
    expect(moonLitPath(10, 10, 10, -0.2, true)).toBe(moonLitPath(10, 10, 10, 0, true))
  })
})

describe("달 모양의 이름", () => {
  it.each([
    [0.01, true, "달이 거의 없는 그믐"],
    [0.2, true, "초승달"],
    [0.5, true, "상현달"],
    [0.8, true, "차오르는 달"],
    [0.99, true, "보름달"],
    [0.99, false, "보름달"],
    [0.8, false, "기우는 달"],
    [0.5, false, "하현달"],
    [0.2, false, "그믐달"],
  ])("밝은 면 %f, 차오름 %s", (illuminatedFraction, waxing, name) => {
    expect(moonPhaseName({ illuminatedFraction, waxing })).toBe(name)
  })
})

describe("뜨고 지는 시각", () => {
  it("분이 있으면 분까지, 정각이면 시만 읽는다", () => {
    expect(koreanTime("2026-11-24T16:28:00+09:00")).toBe("오후 4시 28분")
    expect(koreanTime("2026-11-25T08:00:00+09:00")).toBe("아침 8시")
  })

  it("저녁에 떠서 아침에 지는 달", () => {
    expect(moonTimesText({ rise: "2026-11-24T16:28:00+09:00", set: "2026-11-25T08:00:00+09:00" })).toBe(
      "오후 4시 28분에 떠서 아침 8시에 져요",
    )
  })

  it("저녁에 지고 새벽에 다시 뜨는 달은 지는 것부터 말한다", () => {
    expect(moonTimesText({ rise: "2026-11-10T07:35:00+09:00", set: "2026-11-09T17:20:00+09:00" })).toBe(
      "저녁 5시 20분에 지고 아침 7시 35분에 다시 떠요",
    )
  })

  it("자정을 넘긴 시각은 밤 12시로 읽는다", () => {
    expect(koreanTime("2026-12-01T00:32:00+09:00")).toBe("밤 12시 32분")
    expect(koreanTime("2026-12-01T00:00:00+09:00")).toBe("자정")
  })

  it("한낮에 지는 것은 말하지 않는다", () => {
    expect(moonTimesText({ rise: "2026-12-01T00:32:00+09:00", set: "2026-11-30T12:44:00+09:00" })).toBe("밤 12시 32분에 떠요")
    expect(moonTimesText({ rise: "2026-11-27T21:00:00+09:00", set: "2026-11-28T11:43:00+09:00" })).toBe("밤 9시에 떠요")
  })

  it("한쪽만 있거나 없을 때", () => {
    expect(moonTimesText({ rise: "2026-11-24T23:10:00+09:00" })).toBe("밤 11시 10분에 떠요")
    expect(moonTimesText({ set: "2026-11-25T01:05:00+09:00" })).toBe("새벽 1시 5분에 져요")
    expect(moonTimesText({})).toBe("")
    expect(moonTimesText(undefined)).toBe("")
  })
})
