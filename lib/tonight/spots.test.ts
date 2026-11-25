import { describe, expect, it } from "vitest"
import { distanceText, nearestFirst, SpotsError, straightKm, unwrapFacilities, type Facility } from "./spots"

const BYEOLMARO = {
  id: 3,
  title: "영월 별마로천문대",
  kind: "FACILITY",
  address: "강원도 영월군 영월읍 천문대길 397",
  latitude: 37.19339,
  longitude: 128.49547,
  description: "봉래산 정상의 시민천문대예요.",
  guide: "예약한 회차의 셔틀버스로만 올라가요. 2024년 3월부터 개인 차량은 정상에 갈 수 없어요.",
  isParkingAvailable: false,
  isRestroomAvailable: true,
  isCarAccess: false,
}

function envelope(data: unknown) {
  return { success: true, status: 200, message: "요청이 성공적으로 처리되었습니다.", data }
}

describe("unwrapFacilities", () => {
  it("시설의 이름, 좌표, 안내를 꺼낸다. 없는 값은 빠진다", () => {
    expect(unwrapFacilities(envelope([BYEOLMARO]))).toEqual([
      {
        id: 3,
        title: "영월 별마로천문대",
        address: "강원도 영월군 영월읍 천문대길 397",
        latitude: 37.19339,
        longitude: 128.49547,
        description: "봉래산 정상의 시민천문대예요.",
        guide: "예약한 회차의 셔틀버스로만 올라가요. 2024년 3월부터 개인 차량은 정상에 갈 수 없어요.",
        caution: undefined,
      },
    ])
  })

  it("시설이 아닌 명소와 좌표가 없는 항목은 버린다", () => {
    const openSite = { ...BYEOLMARO, id: 1, title: "강릉 안반데기", kind: "OPEN_SITE" }
    const noPosition = { ...BYEOLMARO, id: 7, latitude: undefined }
    const noName = { ...BYEOLMARO, id: 11, title: "" }

    expect(unwrapFacilities(envelope([openSite, noPosition, noName, BYEOLMARO])).map((facility) => facility.id)).toEqual([3])
  })

  it("봉투의 모양이 다르면 받지 않는다", () => {
    expect(() => unwrapFacilities({ success: false, data: [] })).toThrow(SpotsError)
    expect(() => unwrapFacilities(envelope({ items: [] }))).toThrow(SpotsError)
    expect(() => unwrapFacilities(null)).toThrow(SpotsError)
  })
})

describe("straightKm", () => {
  it("서울 마포에서 별마로천문대까지는 직선으로 145km쯤이다", () => {
    const km = straightKm({ lat: 37.55, lon: 126.91 }, { lat: 37.19339, lon: 128.49547 })

    expect(km).toBeGreaterThan(140)
    expect(km).toBeLessThan(150)
  })

  it("같은 곳은 0이다", () => {
    expect(straightKm({ lat: 37.55, lon: 126.91 }, { lat: 37.55, lon: 126.91 })).toBe(0)
  })
})

describe("nearestFirst", () => {
  const facilities: Facility[] = [
    { id: 29, title: "제주 별빛누리공원", address: "", latitude: 33.4447, longitude: 126.5492 },
    { id: 34, title: "국립과천과학관 천문대", address: "", latitude: 37.43853, longitude: 127.0062 },
    { id: 3, title: "영월 별마로천문대", address: "", latitude: 37.19339, longitude: 128.49547 },
  ]

  it("출발 위치에서 가까운 순으로 놓고 거리를 붙인다", () => {
    const sorted = nearestFirst(facilities, { lat: 37.55, lon: 126.91 })

    expect(sorted.map((facility) => facility.id)).toEqual([34, 3, 29])
    expect(sorted[0].distanceKm).toBeLessThan(20)
  })

  it("출발 위치를 모르면 받은 순서 그대로이고 거리가 없다", () => {
    const sorted = nearestFirst(facilities, null)

    expect(sorted.map((facility) => facility.id)).toEqual([29, 34, 3])
    expect(sorted[0].distanceKm).toBeUndefined()
  })
})

describe("distanceText", () => {
  it("10km가 넘으면 10km 단위로 적는다", () => {
    expect(distanceText(144.6)).toBe("직선으로 약 140km")
    expect(distanceText(15)).toBe("직선으로 약 20km")
  })

  it("가까우면 1km 단위로, 1km 안이면 근처라고 적는다", () => {
    expect(distanceText(6.4)).toBe("직선으로 약 6km")
    expect(distanceText(0.4)).toBe("바로 근처")
  })

  it("거리를 모르면 적지 않는다", () => {
    expect(distanceText(undefined)).toBe("")
  })
})
