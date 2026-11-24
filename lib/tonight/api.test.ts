import { afterEach, describe, expect, it, vi } from "vitest"
import recorded from "./__fixtures__/tonight-2026-11-24.json"
import { fetchNight, NightApiError, nightUrl, unwrapNight } from "./api"

describe("요청 주소", () => {
  it("날짜가 없으면 오늘 밤이다", () => {
    expect(nightUrl(null, {})).toBe("/api/v1/recommendations/tonight")
  })

  it("날짜가 있으면 그 밤이다", () => {
    expect(nightUrl("2026-11-26", {})).toBe("/api/v1/recommendations/nights/2026-11-26")
  })

  it("쿼리를 붙인다", () => {
    expect(
      nightUrl(null, { lat: 37.55, lon: 126.91, minClearHours: 3, preferBefore: "02:00", maxTravelMinutes: 180 }),
    ).toBe("/api/v1/recommendations/tonight?lat=37.55&lon=126.91&minClearHours=3&preferBefore=02%3A00&maxTravelMinutes=180")
  })

  it("위도와 경도는 둘 다 있을 때만 보낸다", () => {
    expect(nightUrl(null, { lat: 37.55 })).toBe("/api/v1/recommendations/tonight")
    expect(nightUrl(null, { lon: 126.91 })).toBe("/api/v1/recommendations/tonight")
  })
})

describe("응답 꺼내기", () => {
  it("공통 봉투에서 data를 꺼낸다", () => {
    const night = unwrapNight(recorded)
    expect(night.date).toBe("2026-11-24")
    expect(night.criteria).toEqual({ minClearHours: 3, preferBefore: "02:00", maxTravelMinutes: null })
    expect(night.candidateCount).toBe(64)
    expect(night.places).toHaveLength(4)
    expect(night.places[0].forecastSource).toBe("OPEN_METEO")
    expect(night.places[0].hours).toHaveLength(13)
  })

  it("추천 시간이 없는 장소는 bestWindow가 빠져 있다", () => {
    const cloudy = unwrapNight(recorded).places[3]
    expect(cloudy.level).toBe("NO")
    expect("bestWindow" in cloudy).toBe(false)
  })

  it.each([
    ["null", null],
    ["실패 봉투", { success: false, status: 400, message: "x" }],
    ["data 없음", { success: true, status: 200 }],
    ["places 없음", { success: true, data: { date: "2026-11-24", criteria: {} } }],
  ])("모양이 다르면 받지 않는다: %s", (_, body) => {
    expect(() => unwrapNight(body)).toThrow(NightApiError)
  })
})

describe("fetchNight", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(response: Response | Error) {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
      if (response instanceof Error) throw response
      return response
    })
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
  }

  it("같은 출처 경로로 부르고 캐시를 쓰지 않는다", async () => {
    const fetchMock = stubFetch(Response.json(recorded))
    const night = await fetchNight(null, { lat: 37.55, lon: 126.91 })
    expect(night.places).toHaveLength(4)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v1/recommendations/tonight?lat=37.55&lon=126.91")
    expect(init?.cache).toBe("no-store")
    expect(new Headers(init?.headers).has("Authorization")).toBe(false)
  })

  it("토큰이 있으면 함께 보낸다", async () => {
    const fetchMock = stubFetch(Response.json(recorded))
    await fetchNight("2026-11-25", {}, { accessToken: "token-1" })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/v1/recommendations/nights/2026-11-25")
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-1")
  })

  it("오류 응답은 상태 코드와 서버 메시지를 담아 던진다", async () => {
    stubFetch(Response.json({ success: false, status: 400, message: "오늘 밤부터 7일 안의 날짜만 볼 수 있습니다." }, { status: 400 }))
    await expect(fetchNight("2027-01-01", {})).rejects.toMatchObject({
      name: "NightApiError",
      status: 400,
      message: "오늘 밤부터 7일 안의 날짜만 볼 수 있습니다.",
    })
  })

  it("JSON이 아닌 오류 응답은 상태 코드만 전한다", async () => {
    stubFetch(new Response("Bad Gateway", { status: 502 }))
    await expect(fetchNight(null, {})).rejects.toMatchObject({ status: 502 })
  })

  it("연결하지 못하면 상태 0으로 던진다", async () => {
    stubFetch(new TypeError("Failed to fetch"))
    await expect(fetchNight(null, {})).rejects.toMatchObject({ name: "NightApiError", status: 0 })
  })

  it("취소는 오류로 바꾸지 않고 그대로 전한다", async () => {
    stubFetch(new DOMException("aborted", "AbortError"))
    await expect(fetchNight(null, {})).rejects.toMatchObject({ name: "AbortError" })
  })
})
