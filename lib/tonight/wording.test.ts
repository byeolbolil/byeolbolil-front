import { describe, expect, it } from "vitest"
import { makeHours } from "./__fixtures__"
import type { NightNote, NightPattern, RecommendationLevel } from "./types"
import {
  cloudHeadline,
  forecastSourceName,
  hourSkyText,
  isWorthGoing,
  levelStars,
  levelText,
  noteText,
  patternText,
} from "./wording"

describe("등급 문구", () => {
  it.each<[RecommendationLevel, string, number]>([
    ["STRONG", "별 보기 아주 좋아요", 3],
    ["GOOD", "별 보기 좋아요", 2],
    ["MAYBE", "별 보기 아쉬워요", 1],
    ["NO", "별 보기 어려워요", 0],
  ])("%s", (level, text, stars) => {
    expect(levelText(level)).toBe(text)
    expect(levelStars(level)).toBe(stars)
  })

  it("별 2개부터 가볼 만한 곳이다", () => {
    expect(isWorthGoing("STRONG")).toBe(true)
    expect(isWorthGoing("GOOD")).toBe(true)
    expect(isWorthGoing("MAYBE")).toBe(false)
    expect(isWorthGoing("NO")).toBe(false)
  })
})

describe("밤 패턴 문구", () => {
  it.each<[NightPattern, string]>([
    ["CLEAR_ALL_NIGHT", "밤새 맑아요"],
    ["CLEAR_EARLY", "초저녁이 가장 맑아요"],
    ["CLEARS_LATE", "늦은 밤에 개요"],
    ["CLEARS_AGAIN", "흐렸다가 다시 개요"],
    ["BRIEF_CLEAR", "잠깐 맑은 틈이 있어요"],
    ["CLOUDY_ALL_NIGHT", "밤새 흐려요"],
  ])("%s", (pattern, text) => {
    expect(patternText(pattern)).toBe(text)
  })
})

describe("주의 문구", () => {
  const window = { start: "2026-11-25T03:00:00+09:00", end: "2026-11-25T06:00:00+09:00", hours: 3 }

  it.each<[NightNote, string]>([
    ["BRIGHT_MOON", "달이 밝아요"],
    ["CITY_LIGHTS", "도시 불빛이 강해요"],
    ["DEW", "이슬 주의"],
  ])("%s", (note, text) => {
    expect(noteText(note, { bestWindow: window })).toBe(text)
  })

  it("불빛이 직접 보이는 곳", () => {
    expect(noteText("LIGHTS_IN_VIEW", {})).toBe("불빛이 직접 보여요")
  })

  it("늦게 개는 곳은 맑아지는 시각을 넣는다", () => {
    expect(noteText("CLEARS_LATE", { bestWindow: window })).toBe("새벽 3시부터 맑아져요")
    expect(noteText("CLEARS_LATE", {})).toBe("늦게 맑아져요")
  })
})

describe("하늘 상태 문구", () => {
  it("맑은 시간은 구름 20%를 경계로 나눈다", () => {
    const [nearlyClear, boundary, partly] = makeHours([
      { clear: true, cloudCover: 19 },
      { clear: true, cloudCover: 20 },
      { clear: true, cloudCover: 30 },
    ])
    expect(hourSkyText(nearlyClear, false)).toBe("맑음")
    expect(hourSkyText(boundary, false)).toBe("구름 조금")
    expect(hourSkyText(partly, false)).toBe("구름 조금")
  })

  it("서버가 맑지 않다고 본 어두운 시간은 구름 많음이다", () => {
    const [cloudy] = makeHours([{ clear: false, cloudCover: 31 }])
    expect(hourSkyText(cloudy, false)).toBe("구름 많음")
  })

  it("어둡지 않은 칸은 저녁과 아침을 구분한다", () => {
    const [bright] = makeHours([{ dark: false, cloudCover: 0 }])
    expect(hourSkyText(bright, true)).toBe("아직 밝아요")
    expect(hourSkyText(bright, false)).toBe("날이 밝아요")
  })

  it("추천 시간의 평균 구름량으로 제목을 고른다", () => {
    expect(cloudHeadline(null)).toBe("구름이 두꺼워요")
    expect(cloudHeadline(0)).toBe("구름 거의 없음")
    expect(cloudHeadline(19)).toBe("구름 거의 없음")
    expect(cloudHeadline(20)).toBe("구름 조금")
  })
})

describe("이름 붙이기", () => {
  it("예보 출처", () => {
    expect(forecastSourceName("OPEN_METEO")).toBe("Open-Meteo")
    expect(forecastSourceName("MET_NORWAY")).toBe("MET Norway")
  })
})
