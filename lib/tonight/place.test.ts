import { describe, expect, it } from "vitest"
import type { NightPlace } from "./types"
import { directionsUrl, isUnsavedCustom, joinParts, placeKey, regionOf, samePosition, travelText, unsavedPlace } from "./place"

describe("regionOf", () => {
  it.each([
    ["강원도 양구군 남면 국토정중앙로 127", "강원 양구"],
    ["강원특별자치도 화천군 사내면 천문대길 431", "강원 화천"],
    ["경기도 안성시 보개면 남사당로 198-54", "경기 안성"],
    ["충청남도 태안군 고남면 장곡리 633", "충남 태안"],
    ["서울특별시 중구 세종대로 110", "서울 중구"],
    ["전북특별자치도 무주군 설천면", "전북 무주"],
    ["제주특별자치도 서귀포시 1100로", "제주 서귀포"],
    ["세종특별자치시", "세종"],
  ])("%s", (address, region) => {
    expect(regionOf(address)).toBe(region)
  })

  it("시도 이름으로 시작하지 않으면 그대로 둔다", () => {
    expect(regionOf("우리집 옥상")).toBe("우리집 옥상")
    expect(regionOf(undefined)).toBe("")
    expect(regionOf("")).toBe("")
  })
})

describe("travelText", () => {
  it("출발지를 모르면 비운다", () => {
    expect(travelText(undefined)).toBe("")
  })

  it("10분 단위로 어림해서 적는다", () => {
    expect(travelText({ distanceKm: 113.1, minutes: 147 })).toBe("차로 약 2시간 30분")
    expect(travelText({ distanceKm: 48.6, minutes: 63 })).toBe("차로 약 1시간")
    expect(travelText({ distanceKm: 20.6, minutes: 27 })).toBe("차로 약 30분")
    expect(travelText({ distanceKm: 4.6, minutes: 6 })).toBe("차로 약 10분")
    expect(travelText({ distanceKm: 137.5, minutes: 179 })).toBe("차로 약 3시간")
  })

  it("5분이 안 걸리면 근처로 적는다", () => {
    expect(travelText({ distanceKm: 0, minutes: 0 })).toBe("지금 있는 곳 근처")
    expect(travelText({ distanceKm: 3, minutes: 4 })).toBe("지금 있는 곳 근처")
    expect(travelText({ distanceKm: 3.9, minutes: 5 })).toBe("차로 약 10분")
  })
})

describe("그 밖의 장소 표기", () => {
  it("명소와 북마크의 ID가 같아도 키는 다르다", () => {
    expect(placeKey({ type: "SPOT", id: 7 })).toBe("SPOT-7")
    expect(placeKey({ type: "BOOKMARK", id: 7 })).toBe("BOOKMARK-7")
  })

  it("길찾기 링크에 이름과 좌표를 넣는다", () => {
    expect(directionsUrl({ name: "화천 조경철천문대", latitude: 38.12, longitude: 127.43 })).toBe(
      `https://map.kakao.com/link/to/${encodeURIComponent("화천 조경철천문대")},38.12,127.43`,
    )
  })

  it("차를 대는 지점의 이름이 있으면 길찾기 도착지에 함께 적는다", () => {
    expect(
      directionsUrl({ name: "강릉 안반데기", viewpoint: "멍에전망대 주차장", latitude: 37.62633, longitude: 128.73942 }),
    ).toBe(`https://map.kakao.com/link/to/${encodeURIComponent("강릉 안반데기 (멍에전망대 주차장)")},37.62633,128.73942`)
  })

  it("빈 조각은 건너뛰고 잇는다", () => {
    expect(joinParts(["저녁 7시 – 새벽 2시", "", undefined, "차로 약 1시간"])).toBe("저녁 7시 – 새벽 2시 · 차로 약 1시간")
    expect(joinParts([])).toBe("")
  })
})

describe("unsavedPlace", () => {
  const bookmark = { type: "BOOKMARK", id: 7, name: "우리 동네 언덕", latitude: 36.1, longitude: 127.5 } as NightPlace

  it("명소를 저장한 북마크는 그 명소로 돌아간다", () => {
    const spot = unsavedPlace({ ...bookmark, spotId: 13 })
    expect(placeKey(spot)).toBe("SPOT-13")
    expect(isUnsavedCustom(spot)).toBe(false)
  })

  it("직접 고른 위치는 명소 ID와 겹치지 않는 키로 남는다", () => {
    const custom = unsavedPlace(bookmark)
    expect(placeKey(custom)).toBe("SPOT--7")
    expect(isUnsavedCustom(custom)).toBe(true)
    expect(custom.name).toBe("우리 동네 언덕")
  })

  it("좌표로 같은 자리를 찾는다", () => {
    expect(samePosition(bookmark, { latitude: 36.1, longitude: 127.5 })).toBe(true)
    expect(samePosition(bookmark, { latitude: 36.10001, longitude: 127.5 })).toBe(false)
  })
})
