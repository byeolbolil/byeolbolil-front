import { describe, expect, it } from "vitest"
import {
  blendFields,
  buildSampler,
  cloudNightUrl,
  cloudOpacity,
  CloudFieldError,
  fieldSize,
  frameAt,
  gridBounds,
  gridCorners,
  mercatorY,
  paintField,
  unwrapCloudNight,
  type CloudGrid,
} from "./cloud-field"

const KOREA: CloudGrid = { south: 32.6, west: 124.2, step: 0.4, rows: 17, columns: 18 }
const SMALL: CloudGrid = { south: 37, west: 127, step: 0.4, rows: 2, columns: 3 }

const envelope = (data: unknown) => ({ success: true, status: 200, message: "요청이 성공적으로 처리되었습니다.", data })

/** 백엔드 CloudMapApiTest가 고정한 응답의 모양 */
const night = envelope({
  date: "2026-11-24",
  source: "OPEN_METEO",
  issuedAt: "2026-11-23T06:00:00Z",
  grid: SMALL,
  hours: [
    { time: "2026-11-24T17:00:00+09:00", cloudCover: [0, 10, 20, 30, 40, 50] },
    { time: "2026-11-24T18:00:00+09:00", cloudCover: [100, 90, 80, 70, 60, 50] },
  ],
})

describe("요청 주소", () => {
  it("밤이 시작하는 날짜로 부른다", () => {
    expect(cloudNightUrl("2026-11-24")).toBe("/api/v1/clouds/nights/2026-11-24")
  })
})

describe("응답 꺼내기", () => {
  it("격자와 시각별 값을 꺼낸다", () => {
    const parsed = unwrapCloudNight(night)
    expect(parsed.date).toBe("2026-11-24")
    expect(parsed.source).toBe("OPEN_METEO")
    expect(parsed.grid).toEqual(SMALL)
    expect(parsed.frames).toHaveLength(2)
    expect(parsed.frames[0]).toEqual({ time: Date.parse("2026-11-24T08:00:00Z"), cover: [0, 10, 20, 30, 40, 50] })
  })

  it("값의 수가 격자와 맞지 않는 시각은 버린다", () => {
    const parsed = unwrapCloudNight(
      envelope({
        date: "2026-11-24",
        source: "OPEN_METEO",
        grid: SMALL,
        hours: [
          { time: "2026-11-24T17:00:00+09:00", cloudCover: [0, 10, 20] },
          { time: "언젠가", cloudCover: [0, 10, 20, 30, 40, 50] },
          { time: "2026-11-24T19:00:00+09:00", cloudCover: [0, 10, 20, 30, 40, 50] },
        ],
      }),
    )
    expect(parsed.frames.map((frame) => frame.time)).toEqual([Date.parse("2026-11-24T10:00:00Z")])
  })

  it("예보가 닿지 않는 밤은 시각이 없다", () => {
    expect(unwrapCloudNight(envelope({ date: "2026-12-24", source: "OPEN_METEO", grid: SMALL, hours: [] })).frames).toEqual([])
  })

  it("봉투나 격자의 모양이 다르면 받지 않는다", () => {
    expect(() => unwrapCloudNight({ success: false })).toThrow(CloudFieldError)
    expect(() => unwrapCloudNight(envelope({ date: "2026-11-24", hours: [] }))).toThrow(CloudFieldError)
    expect(() => unwrapCloudNight(envelope({ date: "2026-11-24", grid: { ...SMALL, rows: 0 }, hours: [] }))).toThrow(CloudFieldError)
  })
})

describe("시각으로 찾기", () => {
  const parsed = unwrapCloudNight(night)

  it("밤 추천의 시각 문자열로 그 시각의 값을 찾는다", () => {
    expect(frameAt(parsed, "2026-11-24T18:00:00+09:00")?.cover[0]).toBe(100)
  })

  it("표기가 달라도 같은 순간이면 찾는다", () => {
    expect(frameAt(parsed, "2026-11-24T09:00:00Z")?.cover[0]).toBe(100)
  })

  it("없는 시각이나 받지 못한 밤은 null이다", () => {
    expect(frameAt(parsed, "2026-11-24T23:00:00+09:00")).toBeNull()
    expect(frameAt(null, "2026-11-24T18:00:00+09:00")).toBeNull()
    expect(frameAt(parsed, null)).toBeNull()
  })
})

describe("지도에 놓을 자리", () => {
  it("바깥 격자점까지가 범위다", () => {
    const bounds = gridBounds(KOREA)
    expect(bounds.south).toBe(32.6)
    expect(bounds.west).toBe(124.2)
    expect(bounds.north).toBeCloseTo(39.0)
    expect(bounds.east).toBeCloseTo(131.0)
  })

  it("귀퉁이는 왼쪽 위에서 시계 방향이다", () => {
    const corners = gridCorners(SMALL)
    expect(corners[0][0]).toBe(127)
    expect(corners[0][1]).toBeCloseTo(37.4)
    expect(corners[2][0]).toBeCloseTo(127.8)
    expect(corners[2][1]).toBe(37)
  })

  it("세로 크기는 메르카토르에서의 비율을 따른다. 위도 비율보다 길다", () => {
    const { width, height } = fieldSize(KOREA, 288)
    expect(width).toBe(288)
    const byLatitude = (288 * (39.0 - 32.6)) / (131.0 - 124.2)
    expect(height).toBeGreaterThan(byLatitude * 1.2)
    expect(height).toBe(Math.round((288 * (mercatorY(39.0) - mercatorY(32.6))) / ((6.8 * Math.PI) / 180)))
  })
})

describe("그림 그리기", () => {
  const grid: CloudGrid = { south: 36, west: 127, step: 1, rows: 2, columns: 2 }
  const sampler = buildSampler(grid, 9)
  const alphaAt = (pixels: Uint8ClampedArray, x: number, y: number) => pixels[(y * sampler.width + x) * 4 + 3]

  it("구름이 10% 아래면 그리지 않고 많을수록 짙다", () => {
    expect(cloudOpacity(0)).toBe(0)
    expect(cloudOpacity(20)).toBe(0)
    expect(cloudOpacity(21)).toBeGreaterThan(0)
    expect(cloudOpacity(50)).toBeGreaterThan(cloudOpacity(30))
    expect(cloudOpacity(100)).toBe(cloudOpacity(90))
    expect(cloudOpacity(100)).toBeLessThan(1)
  })

  it("위쪽 화소가 북쪽이고 왼쪽 화소가 서쪽이다", () => {
    const pixels = new Uint8ClampedArray(sampler.width * sampler.height * 4)
    // 북동쪽 점만 흐리다
    paintField(pixels, sampler, Float32Array.from([0, 0, 0, 100]))
    const midY = Math.floor(sampler.height / 2)
    const midX = Math.floor(sampler.width / 2)
    expect(alphaAt(pixels, sampler.width - 2, 1)).toBeGreaterThan(alphaAt(pixels, 1, 1))
    expect(alphaAt(pixels, sampler.width - 2, 1)).toBeGreaterThan(alphaAt(pixels, sampler.width - 2, sampler.height - 2))
    expect(alphaAt(pixels, midX, midY)).toBeGreaterThan(alphaAt(pixels, 1, sampler.height - 2))
  })

  it("테두리 화소는 투명하다", () => {
    const pixels = new Uint8ClampedArray(sampler.width * sampler.height * 4)
    paintField(pixels, sampler, Float32Array.from([100, 100, 100, 100]))
    expect(alphaAt(pixels, 0, 0)).toBe(0)
    expect(alphaAt(pixels, sampler.width - 1, sampler.height - 1)).toBe(0)
    expect(alphaAt(pixels, Math.floor(sampler.width / 2), Math.floor(sampler.height / 2))).toBeGreaterThan(150)
  })

  it("두 시각 사이의 값을 섞는다", () => {
    const out = new Float32Array(2)
    blendFields(Float32Array.from([0, 100]), Float32Array.from([100, 0]), 0.25, out)
    expect(Array.from(out)).toEqual([25, 75])
  })
})
