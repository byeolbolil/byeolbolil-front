import { describe, expect, it } from "vitest"
import { layerDepth } from "./history-layers"

describe("기록 칸의 층", () => {
  it("층을 열며 쌓은 칸은 그 층의 번호를 준다", () => {
    expect(layerDepth({ bbLayer: 2, __NA: true })).toBe(2)
  })

  it("층을 열기 전의 칸이나 알 수 없는 값은 0층이다", () => {
    expect(layerDepth(null)).toBe(0)
    expect(layerDepth({ __NA: true })).toBe(0)
    expect(layerDepth({ bbLayer: "2" })).toBe(0)
    expect(layerDepth({ bbLayer: -1 })).toBe(0)
  })
})
