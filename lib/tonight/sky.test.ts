import { describe, expect, it } from "vitest"
import { knownNotes, knownSky } from "./clean"
import { naverSearchUrl, pointMapUrl, safePoints, searchUrl } from "./links"
import { skyBrightnessText, skyGlow, skyHint, skyName, skyScalePosition } from "./sky"

describe("하늘 밝기를 말로", () => {
  it("등급마다 이름이 있고, 등급을 모르면 모른다고 적는다", () => {
    expect(skyName("NATURAL")).toBe("자연 그대로의 하늘")
    expect(skyName("DARK")).toBe("어두운 하늘")
    expect(skyName("RURAL")).toBe("시골 하늘")
    expect(skyName("SUBURBAN")).toBe("교외 하늘")
    expect(skyName("URBAN")).toBe("도시 하늘")
    expect(skyName(undefined)).toBe("하늘 밝기를 모르는 곳")
  })

  it("은하수가 보이는지는 시골 하늘과 교외 하늘 사이에서 갈린다", () => {
    expect(skyHint("RURAL")).toBe("은하수가 보이지만 불빛이 번져 있어요")
    expect(skyHint("SUBURBAN")).toBe("은하수는 보이지 않아요")
    expect(skyHint(undefined)).toBe("")
  })

  it.each([
    [3.99, "인공 불빛이 자연 밤하늘의 약 4배예요"],
    [5.93, "인공 불빛이 자연 밤하늘의 약 5.9배예요"],
    [1.49, "인공 불빛이 자연 밤하늘의 약 1.5배예요"],
    [67.7, "인공 불빛이 자연 밤하늘의 약 68배예요"],
    [9.96, "인공 불빛이 자연 밤하늘의 약 10배예요"],
    [0.52, "인공 불빛이 자연 밤하늘의 50%쯤이에요"],
    [0.04, "인공 불빛이 거의 없어요"],
  ])("하늘 밝기 %s", (value, text) => {
    expect(skyBrightnessText(value)).toBe(text)
  })

  it("자료가 없는 곳은 없다고 적는다", () => {
    expect(skyBrightnessText(undefined)).toBe("이곳의 하늘 밝기 자료가 없어요")
  })
})

describe("하늘 밝기를 그림으로", () => {
  it("자연 상태(0.33)까지는 0이고 도시(50)부터는 1이다", () => {
    expect(skyGlow(0.1)).toBe(0)
    expect(skyGlow(0.33)).toBe(0)
    expect(skyGlow(50)).toBe(1)
    expect(skyGlow(200)).toBe(1)
  })

  it("그 사이는 밝기의 로그로 잇는다. 0.33과 50의 한가운데는 그 둘을 곱한 값의 제곱근이다", () => {
    expect(skyGlow(Math.sqrt(0.33 * 50))).toBeCloseTo(0.5, 6)
    expect(skyGlow(3.99)).toBeCloseTo(0.496, 2)
    expect(skyGlow(5.93)).toBeCloseTo(0.575, 2)
  })

  it("하늘 밝기를 모르면 2로 본다", () => {
    expect(skyGlow(undefined)).toBe(skyGlow(2))
  })

  it("눈금은 다섯 칸이고 등급의 경계가 칸의 경계다", () => {
    expect(skyScalePosition(0.33)).toBeCloseTo(0.2, 6)
    expect(skyScalePosition(2)).toBeCloseTo(0.4, 6)
    expect(skyScalePosition(10)).toBeCloseTo(0.6, 6)
    expect(skyScalePosition(50)).toBeCloseTo(0.8, 6)
  })

  it("칸 안에서는 밝을수록 오른쪽이고, 눈금 밖의 값은 끝에 붙는다", () => {
    expect(skyScalePosition(5.93)).toBeGreaterThan(skyScalePosition(3.99))
    expect(skyScalePosition(3.99)).toBeGreaterThan(0.4)
    expect(skyScalePosition(5.93)).toBeLessThan(0.6)
    expect(skyScalePosition(0.001)).toBe(0)
    expect(skyScalePosition(9999)).toBe(1)
  })
})

describe("모르는 값 걸러 내기", () => {
  it("아는 주의 사항만 남긴다", () => {
    expect(knownNotes(["BRIGHT_MOON", "SOMETHING_NEW", "LIGHTS_IN_VIEW", 3, null])).toEqual(["BRIGHT_MOON", "LIGHTS_IN_VIEW"])
    expect(knownNotes(undefined)).toEqual([])
    expect(knownNotes("DEW")).toEqual([])
  })

  it("하늘 밝기는 숫자일 때만, 등급은 아는 값일 때만 받는다", () => {
    expect(knownSky({ skyBrightness: 3.99, skyClass: "RURAL" })).toEqual({ skyBrightness: 3.99, skyClass: "RURAL" })
    expect(knownSky({ skyBrightness: "3.99", skyClass: "MOONLIT" })).toEqual({})
    expect(knownSky({})).toEqual({})
  })
})

describe("보는 자리", () => {
  it("이름과 설명이 있는 자리만 남기고, 좌표는 둘 다 숫자일 때만 받는다", () => {
    const points = safePoints([
      { name: "군립공원 정상 주차장", access: "차로 올라가요.", latitude: 35.48649, longitude: 127.9843 },
      { name: "별빛언덕", access: "걸어서 20분쯤이에요." },
      { name: "좌표가 반쪽", access: "설명", latitude: 35.1 },
      { name: "", access: "이름 없음" },
      { name: "설명 없음" },
      null,
    ])

    expect(points).toEqual([
      { name: "군립공원 정상 주차장", access: "차로 올라가요.", latitude: 35.48649, longitude: 127.9843 },
      { name: "별빛언덕", access: "걸어서 20분쯤이에요." },
      { name: "좌표가 반쪽", access: "설명" },
    ])
    expect(safePoints(undefined)).toEqual([])
  })

  it("좌표를 아는 자리만 지도를 연다", () => {
    expect(pointMapUrl("합천 황매산", { name: "별빛언덕", access: "걸어요" })).toBeNull()
    expect(pointMapUrl("합천 황매산", { name: "정상 주차장", access: "차로", latitude: 35.48649, longitude: 127.9843 })).toBe(
      `https://map.kakao.com/link/map/${encodeURIComponent("합천 황매산 정상 주차장")},35.48649,127.9843`,
    )
  })

  it("후기 검색은 구글과 네이버에서 같은 말로 찾는다", () => {
    const query = encodeURIComponent("합천 황매산 별 보기")
    expect(searchUrl("합천 황매산")).toBe(`https://www.google.com/search?q=${query}`)
    expect(naverSearchUrl("합천 황매산")).toBe(`https://search.naver.com/search.naver?query=${query}`)
    expect(naverSearchUrl("대전 시민천문대", true)).toBe(
      `https://search.naver.com/search.naver?query=${encodeURIComponent("대전 시민천문대")}`,
    )
  })
})
