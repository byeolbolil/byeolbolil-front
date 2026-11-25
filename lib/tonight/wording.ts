/**
 * API가 enum 이름으로 주는 등급, 밤 패턴, 주의 사항에 붙이는 문구.
 * 문구는 목업(`docs/mockup/index.html`)과 API 문서(`docs/MOBILE_DEVELOPER_GUIDE.md` 5.10)를 따른다.
 */
import { hourOf, koreanHour } from "./time"
import type { ForecastSource, NightHour, NightNote, NightPattern, NightPlace, RecommendationLevel } from "./types"

/**
 * 등급의 이름. 별을 보기에 어떤 밤인지를 그대로 말한다.
 * 처음에는 "꼭 가볼 만해요", "가볼 만해요"였는데 둘의 차이가 읽히지 않는다는 의견이 있어 바꿨다.
 */
const LEVEL_TEXT: Record<RecommendationLevel, string> = {
  STRONG: "별 보기 아주 좋아요",
  GOOD: "별 보기 좋아요",
  MAYBE: "별 보기 아쉬워요",
  NO: "별 보기 어려워요",
}

/** 등급을 별 개수로. NO는 별 대신 구름으로 보여준다. */
const LEVEL_STARS: Record<RecommendationLevel, number> = { STRONG: 3, GOOD: 2, MAYBE: 1, NO: 0 }

const PATTERN_TEXT: Record<NightPattern, string> = {
  CLEAR_ALL_NIGHT: "밤새 맑아요",
  CLEAR_EARLY: "초저녁이 가장 맑아요",
  CLEARS_LATE: "늦은 밤에 개요",
  CLEARS_AGAIN: "흐렸다가 다시 개요",
  BRIEF_CLEAR: "잠깐 맑은 틈이 있어요",
  CLOUDY_ALL_NIGHT: "밤새 흐려요",
}

const SOURCE_NAME: Record<ForecastSource, string> = {
  OPEN_METEO: "Open-Meteo",
  MET_NORWAY: "MET Norway",
}

/**
 * "구름 거의 없음"이라고 부르는 구름량의 상한(%).
 * 7Timer! CIVIL 예보가 총운량 20% 미만을 clear로 분류한다. https://www.7timer.info/doc.php?lang=en
 * 맑은 시간인지(30% 이하)는 서버가 `clear`로 판정해서 주고, 이 값은 맑은 시간 안에서 문구를 나눌 때만 쓴다.
 */
export const NEARLY_CLEAR_CLOUD_COVER = 20

export function levelText(level: RecommendationLevel): string {
  return LEVEL_TEXT[level]
}

export function levelStars(level: RecommendationLevel): number {
  return LEVEL_STARS[level]
}

/** 가볼 만한 등급(별 2개 이상)인지. 첫 화면의 "가장 좋은 곳"은 이 등급부터 올린다. */
export function isWorthGoing(level: RecommendationLevel): boolean {
  return LEVEL_STARS[level] >= 2
}

export function patternText(pattern: NightPattern): string {
  return PATTERN_TEXT[pattern]
}

/** 목록에 짧게 붙이는 주의 문구. 늦게 개는 경우는 맑아지는 시각을 넣는다. */
export function noteText(note: NightNote, place: Pick<NightPlace, "bestWindow">): string {
  switch (note) {
    case "CLEARS_LATE":
      return place.bestWindow ? `${koreanHour(hourOf(place.bestWindow.start))}부터 맑아져요` : "늦게 맑아져요"
    case "BRIGHT_MOON":
      return "달이 밝아요"
    case "CITY_LIGHTS":
      return "도시 불빛이 강해요"
    case "LIGHTS_IN_VIEW":
      return "불빛이 직접 보여요"
    case "DEW":
      return "이슬 주의"
  }
}

export function forecastSourceName(source: ForecastSource): string {
  return SOURCE_NAME[source]
}

/** 밤 띠를 훑을 때 보여주는 한 시간의 하늘 상태. `beforeDark`는 아직 어두워지기 전인 저녁 칸인지다. */
export function hourSkyText(hour: NightHour, beforeDark: boolean): string {
  if (!hour.dark) return beforeDark ? "아직 밝아요" : "날이 밝아요"
  if (!hour.clear) return "구름 많음"
  return hour.cloudCover < NEARLY_CLEAR_CLOUD_COVER ? "맑음" : "구름 조금"
}

/** 추천 시간의 평균 구름량에 붙이는 제목. 추천 시간이 없으면 구름이 두꺼운 밤이다. */
export function cloudHeadline(averageCloudCover: number | null): string {
  if (averageCloudCover === null) return "구름이 두꺼워요"
  return averageCloudCover < NEARLY_CLEAR_CLOUD_COVER ? "구름 거의 없음" : "구름 조금"
}
