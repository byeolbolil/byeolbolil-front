/**
 * 추천 카드에 적는 짧은 설명들. 문구는 목업을 따르되, API가 주지 않는 값(보이는 별 개수, 계절 별자리)이 필요한
 * 문장은 넣지 않았다.
 */
import { average, moonSummary, windowHours } from "./hours"
import { hourOf, koreanHour } from "./time"
import type { NightPlace, NightRecommendation } from "./types"
import { bortleName, cloudHeadline, isWorthGoing, patternText } from "./wording"

export interface QuickFact {
  title: string
  detail: string
}

/** 추천 시간의 평균 구름량(%). 추천 시간이 없으면 `null`. */
export function windowCloudAverage(place: NightPlace): number | null {
  return average(windowHours(place.hours, place.bestWindow), (hour) => hour.cloudCover)
}

export function cloudFact(place: NightPlace): QuickFact {
  return { title: cloudHeadline(windowCloudAverage(place)), detail: patternText(place.pattern) }
}

/** 어두운 시간이 없는 밤(예보가 끊긴 경우)은 달 이야기를 하지 않는다. */
export function moonFact(place: NightPlace): QuickFact | null {
  const moon = moonSummary(place)
  if (!moon) return null
  switch (moon.kind) {
    case "NO_MOON":
      return { title: "달 없는 밤", detail: "어두운 하늘을 즐기기 좋아요" }
    case "BRIGHT":
      return { title: "달이 밝아요", detail: "희미한 별은 잘 안 보여요" }
    case "SETS_EARLY":
      return { title: "달이 일찍 져요", detail: `${koreanHour(hourOf(moon.darkFrom))}부터 어두워요` }
    case "RISES_LATE":
      return { title: "달이 늦게 떠요", detail: `${koreanHour(hourOf(moon.darkUntil))}까지 어두워요` }
    case "UP_ALL_NIGHT":
      return { title: "달이 밤새 떠 있어요", detail: `보름달 밝기의 ${Math.round(place.moonBrightness * 100)}%예요` }
  }
}

export function skyFact(place: NightPlace): QuickFact {
  const detail = place.notes.includes("BRIGHT_MOON")
    ? "달빛 때문에 오늘은 별이 줄어요"
    : `광해 9등급 중 ${place.bortleClass}등급이에요`
  return { title: bortleName(place.bortleClass), detail }
}

/**
 * 카드 아래의 한마디. 눈이 어둠에 익는 시간은 Kalloniatis & Luu, "Light and Dark Adaptation", Webvision을 따른다
 * (5~8분에 감도가 크게 바뀌고 40분쯤 평탄해진다).
 */
export function tipText(place: NightPlace): string {
  if (!place.bestWindow) return "오늘은 쉬고, 맑은 날을 기다려 보세요."
  const parts: string[] = []
  if (place.notes.includes("BRIGHT_MOON")) {
    parts.push("달이 밝은 날이라 은하수는 어렵지만, 달 표면을 쌍안경으로 보면 크레이터까지 보여요.")
  } else if (place.notes.includes("CITY_LIGHTS")) {
    parts.push("도시 불빛이 있어도 밝은 별자리는 충분히 보여요.")
  }
  if (place.notes.includes("DEW")) parts.push("습도가 높아서 렌즈에 이슬이 맺힐 수 있어요.")
  parts.push("도착하면 휴대폰 화면을 끄고 30분쯤 기다려 보세요. 눈이 어둠에 완전히 익는 데는 40분쯤 걸려요.")
  return parts.join(" ")
}

/** 하늘 사진의 종류. 흐린 밤, 달이 밝은 밤, 맑은 밤이다. */
export type SkyPhotoKind = "clear" | "moon" | "cloudy"

export function skyPhotoKind(place: NightPlace | null): SkyPhotoKind {
  if (!place || place.level === "NO") return "cloudy"
  return place.notes.includes("BRIGHT_MOON") ? "moon" : "clear"
}

export type EmptyKind = "NO_FORECAST" | "ALL_EXCLUDED" | "CLOUDY" | "POOR"

export interface NightView {
  /** 첫 화면에 크게 올리는 곳. 가볼 만한 곳이 없으면 `null`이다. */
  top: NightPlace | null
  /** 그 밖의 후보. 가볼 만한 곳이 없는 밤에는 쉬어가라는 곳을 뺀다. */
  rest: NightPlace[]
  /** `top`이 없을 때 그 이유. */
  empty: EmptyKind | null
}

/** 추천 응답을 첫 화면의 구성으로 나눈다. `places`는 서버가 추천 순서대로 준다. */
export function buildNightView(recommendation: NightRecommendation): NightView {
  const { places } = recommendation
  const first = places[0]
  if (first && isWorthGoing(first.level)) {
    return { top: first, rest: places.slice(1), empty: null }
  }
  const rest = places.filter((place) => place.level !== "NO")
  if (places.length === 0) {
    const empty: EmptyKind =
      recommendation.excludedByTravelCount > 0 && recommendation.evaluatedCount > 0 ? "ALL_EXCLUDED" : "NO_FORECAST"
    return { top: null, rest, empty }
  }
  return { top: null, rest, empty: rest.length === 0 ? "CLOUDY" : "POOR" }
}

/** 가볼 만한 곳이 없는 밤의 제목과 설명. `maxTravelHours`는 이동 시간 한도를 적용했을 때만 넘긴다. */
export function emptyMessage(kind: EmptyKind, maxTravelHours: number | null): { title: string; detail: string } {
  const reach = maxTravelHours ? `${maxTravelHours}시간 안에 갈 수 있는 곳` : "갈 수 있는 곳"
  switch (kind) {
    case "CLOUDY":
      return { title: "구름이 많은 밤이에요", detail: `${reach}이 모두 흐려요` }
    case "POOR":
      return { title: "별 보기 아쉬운 밤이에요", detail: `${reach} 중에 가볼 만한 곳이 없어요` }
    case "ALL_EXCLUDED":
      return { title: "가까운 후보가 없어요", detail: `${reach}이 없어요. 설정에서 이동 시간을 늘려 보세요` }
    case "NO_FORECAST":
      return { title: "예보를 받지 못했어요", detail: "잠시 뒤에 다시 시도해 주세요" }
  }
}
