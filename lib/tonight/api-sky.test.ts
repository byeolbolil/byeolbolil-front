import { describe, expect, it } from "vitest"
import { skyUrl, unwrapSky } from "./api"

describe("한 좌표의 하늘 밝기", () => {
  it("좌표를 소수 다섯째 자리까지 보낸다", () => {
    expect(skyUrl({ lat: 37.626334567, lon: 128.7394 })).toBe("/api/v1/recommendations/sky?lat=37.62633&lon=128.73940")
  })

  it("값이 있으면 그대로 받는다", () => {
    const body = {
      success: true,
      data: { latitude: 37.6, longitude: 128.7, skyBrightness: 3.11, skyClass: "RURAL", litSurroundings: false },
    }
    expect(unwrapSky(body)).toEqual({ skyBrightness: 3.11, skyClass: "RURAL", litSurroundings: false })
  })

  it("범위 밖이라 값이 빠지면 빈 값으로 받는다", () => {
    expect(unwrapSky({ success: true, data: { latitude: 35, longitude: 140 } })).toEqual({})
  })

  it("모르는 등급은 버린다", () => {
    expect(unwrapSky({ success: true, data: { skyBrightness: 3, skyClass: "BORTLE_4" } })).toEqual({ skyBrightness: 3 })
  })

  it("봉투가 아니면 받지 않는다", () => {
    expect(() => unwrapSky({ data: {} })).toThrow()
  })
})
