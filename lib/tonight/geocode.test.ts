import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanQuery, fetchAreaName, GeocodeError, reverseUrl, searchPlaces, searchUrl, unwrapAreaName, unwrapPlaces } from "./geocode"

const envelope = (data: unknown) => ({ success: true, status: 200, message: "요청이 성공적으로 처리되었습니다.", data })

/** 백엔드 GeocodeApiTest가 고정한 응답의 앞 두 항목 */
const hwaaksan = envelope([
  { name: "화악산", address: "경기도 가평군 북면", latitude: 37.9946674, longitude: 127.5034314 },
  { name: "화악산", address: "경상북도 청도군 청도읍", latitude: 35.5932802, longitude: 128.6915855 },
])

function respondWith(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("검색어 다듬기", () => {
  it("앞뒤 공백을 떼고 여러 칸 띄어쓰기를 한 칸으로 줄인다", () => {
    expect(cleanQuery("  가평   화악산 ")).toBe("가평 화악산")
  })

  it("두 글자보다 짧으면 찾지 않는다", () => {
    expect(cleanQuery("")).toBeNull()
    expect(cleanQuery(" 강 ")).toBeNull()
    expect(cleanQuery("강릉")).toBe("강릉")
  })

  it("50자까지만 보낸다", () => {
    expect(cleanQuery("가".repeat(60))).toHaveLength(50)
  })
})

describe("요청 주소", () => {
  it("검색어를 인코딩한다", () => {
    expect(searchUrl("가평 화악산")).toBe("/api/v1/geocode/search?q=%EA%B0%80%ED%8F%89+%ED%99%94%EC%95%85%EC%82%B0")
    expect(searchUrl("a&b")).toBe("/api/v1/geocode/search?q=a%26b")
  })

  it("좌표는 소수 셋째 자리까지만 보낸다", () => {
    expect(reverseUrl({ lat: 37.6227907, lon: 128.7392743 })).toBe("/api/v1/geocode/reverse?lat=37.623&lon=128.739")
  })
})

describe("응답 꺼내기", () => {
  it("공통 봉투에서 장소를 꺼내고 좌표 이름을 lat, lon으로 바꾼다", () => {
    expect(unwrapPlaces(hwaaksan)).toEqual([
      { name: "화악산", address: "경기도 가평군 북면", lat: 37.9946674, lon: 127.5034314 },
      { name: "화악산", address: "경상북도 청도군 청도읍", lat: 35.5932802, lon: 128.6915855 },
    ])
  })

  it("찾은 곳이 없으면 빈 배열이다", () => {
    expect(unwrapPlaces(envelope([]))).toEqual([])
  })

  it("이름이나 좌표가 없는 항목은 버린다", () => {
    const places = unwrapPlaces(
      envelope([
        { name: "", address: "", latitude: 37, longitude: 127 },
        { name: "좌표 없음", address: "" },
        { name: "양평군", latitude: 37.4916, longitude: 127.4875 },
      ]),
    )
    expect(places).toEqual([{ name: "양평군", address: "", lat: 37.4916, lon: 127.4875 }])
  })

  it("봉투의 모양이 다르면 받지 않는다", () => {
    expect(() => unwrapPlaces({ success: false })).toThrow(GeocodeError)
    expect(() => unwrapPlaces(envelope({}))).toThrow(GeocodeError)
  })

  it("지역 이름을 꺼낸다. 근처에 아무것도 없으면 null이다", () => {
    expect(unwrapAreaName(envelope({ name: "강릉시 왕산면" }))).toBe("강릉시 왕산면")
    expect(unwrapAreaName(envelope({}))).toBeNull()
  })
})

describe("호출", () => {
  it("이름으로 찾는다", async () => {
    const fetchMock = respondWith(200, hwaaksan)

    const places = await searchPlaces("화악산")

    expect(places).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/geocode/search?q=%ED%99%94%EC%95%85%EC%82%B0", expect.anything())
  })

  it("좌표의 지역 이름을 받는다", async () => {
    respondWith(200, envelope({ name: "강릉시 왕산면" }))

    expect(await fetchAreaName({ lat: 37.623, lon: 128.739 })).toBe("강릉시 왕산면")
  })

  it("오류 응답은 상태 코드와 서버의 문구를 담아 던진다", async () => {
    respondWith(503, { success: false, status: 503, message: "지명 검색을 지금 쓸 수 없습니다. 잠시 후 다시 시도해 주세요." })

    await expect(searchPlaces("화악산")).rejects.toMatchObject({
      name: "GeocodeError",
      status: 503,
      message: "지명 검색을 지금 쓸 수 없습니다. 잠시 후 다시 시도해 주세요.",
    })
  })

  it("연결하지 못하면 상태 코드가 0이다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      }),
    )

    await expect(searchPlaces("화악산")).rejects.toMatchObject({ status: 0 })
  })

  it("취소한 요청은 취소 오류를 그대로 넘긴다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("aborted", "AbortError")
      }),
    )

    await expect(searchPlaces("화악산")).rejects.toMatchObject({ name: "AbortError" })
  })
})
