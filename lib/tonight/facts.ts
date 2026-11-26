/**
 * 추천 카드에 적는 짧은 설명들. 문구는 목업을 따르되, API가 주지 않는 값(보이는 별 개수, 계절 별자리)이 필요한
 * 문장은 넣지 않았다.
 */
import { average, moonSummary, windowHours } from "./hours"
import { moonTimesText } from "./moon"
import { hourOf, koreanHour } from "./time"
import type { ForecastSource, NightPlace, NightRecommendation, NightSummary, RecommendationLevel } from "./types"
import { skyBrightnessText, skyName, skyRankText } from "./sky"
import { cloudHeadline, isWorthGoing, patternText } from "./wording"

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
  const fact = moonHeadline(place)
  if (!fact) return null
  // 언제 뜨고 지는지를 알면 설명 뒤에 붙인다
  const times = moonTimesText(place.moon)
  return times ? { title: fact.title, detail: `${fact.detail} · ${times}` } : fact
}

function moonHeadline(place: NightPlace): QuickFact | null {
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

/** 하늘이 얼마나 어두운 곳인지. 오늘 밤 그 하늘을 더 가리는 것이 있으면 그쪽을 먼저 말한다 */
export function skyFact(place: Pick<NightPlace, "notes" | "skyBrightness" | "skyClass" | "skyRank">): QuickFact {
  return { title: skyName(place.skyClass), detail: skyDetail(place) }
}

function skyDetail(place: Pick<NightPlace, "notes" | "skyBrightness" | "skyRank">): string {
  if (place.notes.includes("BRIGHT_MOON")) return "달빛 때문에 오늘은 별이 줄어요"
  if (place.notes.includes("LIGHTS_IN_VIEW")) return "아래쪽 마을이나 도시의 불빛이 직접 보여요"
  return place.skyRank ? skyRankText(place.skyRank) : skyBrightnessText(place.skyBrightness)
}

/**
 * 이 등급이 된 이유를 한 줄로. 서버가 준 등급, 추천 시간, 주의 사항만으로 말하고 여기서 다시 판정하지 않는다.
 * 맑은 시간이 얼마나 되는지를 먼저 말하고, 등급을 낮춘 사정이 있으면 "~지만"으로 잇는다.
 */
export function levelReason(place: Pick<NightPlace, "level" | "bestWindow" | "notes" | "pattern">): string {
  const window = place.bestWindow
  if (!window) {
    return place.pattern === "CLOUDY_ALL_NIGHT" ? "밤새 구름이 많아요" : "어두운 시간에 맑은 틈이 이어지지 않아요"
  }
  const downs: string[] = []
  if (place.notes.includes("CLEARS_LATE")) downs.push(`${koreanHour(hourOf(window.start))}에야 맑아져요`)
  if (place.notes.includes("BRIGHT_MOON")) downs.push("달이 밝아요")
  if (place.notes.includes("CITY_LIGHTS")) downs.push("도시 불빛이 강해요")
  if (downs.length === 0) {
    if (place.level === "STRONG") return `맑은 시간이 ${window.hours}시간 이어져요`
    return window.hours < 3 ? `맑은 시간이 ${window.hours}시간뿐이에요` : `${window.hours}시간 맑지만 늦은 시간에 몰려 있어요`
  }
  const [first, ...rest] = downs
  if (place.notes.includes("CLEARS_LATE")) return [`${first}`, ...rest].join(". ")
  return `${window.hours}시간 맑지만 ${[first, ...rest].join(", ")}`
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
  } else if (place.notes.includes("LIGHTS_IN_VIEW")) {
    parts.push("불빛이 보이는 쪽을 등지고 서면 별이 더 잘 보여요.")
  }
  if (place.notes.includes("DEW")) parts.push("습도가 높아서 렌즈에 이슬이 맺힐 수 있어요.")
  parts.push("도착하면 휴대폰 화면을 끄고 30분쯤 기다려 보세요. 눈이 어둠에 완전히 익는 데는 40분쯤 걸려요.")
  return parts.join(" ")
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

/**
 * 밤 고르기에 그릴 밤마다의 등급. 요약으로 받은 값을 쓰되, 지금 보고 있는 밤은 받아 둔 추천의 첫 장소 등급으로 덮는다.
 * 요약과 추천은 따로 받아서 그 사이에 예보가 새로 나올 수 있는데, 그래도 버튼과 카드가 서로 다른 말을 하지 않는다.
 * 평가한 곳이 없는 밤은 들어 있지 않다.
 */
export function nightLevels(
  summary: NightSummary | null,
  shown: NightRecommendation | null,
): Map<string, RecommendationLevel> {
  const levels = new Map<string, RecommendationLevel>()
  for (const night of summary?.nights ?? []) {
    if (night.level) levels.set(night.date, night.level)
  }
  if (shown) {
    const first = shown.places[0]
    if (first) levels.set(shown.date, first.level)
    else levels.delete(shown.date)
  }
  return levels
}

/**
 * 가볼 만한 곳이 없는 밤의 제목과 설명. `maxTravelHours`는 이동 시간 한도를 적용했을 때만 넘긴다.
 * 서버가 한도를 6분의 1까지 넘는 곳도 남기므로(이동 시간이 어림값이라서) "안팎"이라고 적는다.
 */
export function emptyMessage(kind: EmptyKind, maxTravelHours: number | null): { title: string; detail: string } {
  const reach = maxTravelHours ? `${maxTravelHours}시간 안팎에 갈 수 있는 곳` : "갈 수 있는 곳"
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

export interface ForecastCredit {
  source: ForecastSource
  /** 그 출처에서 받은 예보 가운데 가장 최근에 만들어진 것의 시각. 모르면 빠진다 */
  issuedAt?: string
}

/**
 * 화면에 적을 예보 출처. 장소마다 출처가 다를 수 있어서(주 소스 장애 시 보조 소스) 쓰인 출처를 모두 모은다.
 * 많이 쓰인 출처가 앞에 온다.
 */
export function forecastCredits(places: readonly Pick<NightPlace, "forecastSource" | "forecastIssuedAt">[]): ForecastCredit[] {
  const bySource = new Map<ForecastSource, { count: number; issuedAt?: string }>()
  for (const place of places) {
    const entry = bySource.get(place.forecastSource) ?? { count: 0 }
    entry.count += 1
    if (place.forecastIssuedAt && (!entry.issuedAt || Date.parse(place.forecastIssuedAt) > Date.parse(entry.issuedAt))) {
      entry.issuedAt = place.forecastIssuedAt
    }
    bySource.set(place.forecastSource, entry)
  }
  return [...bySource.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([source, entry]) => (entry.issuedAt ? { source, issuedAt: entry.issuedAt } : { source }))
}
