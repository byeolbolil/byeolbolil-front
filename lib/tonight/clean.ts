/**
 * 서버가 값 목록을 늘려도 화면이 버티게, 응답에서 모르는 값을 걸러 낸다.
 * API 문서가 주의 사항과 등급의 값은 늘어날 수 있다고 적어 두었다(백엔드 저장소 docs/API.md).
 */
import type { NightNote, SkyClass } from "./types"

const NOTES: readonly string[] = ["CLEARS_LATE", "BRIGHT_MOON", "CITY_LIGHTS", "LIGHTS_IN_VIEW", "DEW"] satisfies NightNote[]
const SKY_CLASSES: readonly string[] = ["NATURAL", "DARK", "RURAL", "SUBURBAN", "URBAN"] satisfies SkyClass[]

/** 아는 주의 사항만 남긴다. 배열이 아니면 빈 배열이다 */
export function knownNotes(value: unknown): NightNote[] {
  if (!Array.isArray(value)) return []
  return value.filter((note): note is NightNote => typeof note === "string" && NOTES.includes(note))
}

/** 하늘 밝기와 등급, 국내 순위. 숫자가 아니거나 모르는 등급, 범위 밖의 순위면 없는 것으로 본다 */
export function knownSky(item: Record<string, unknown>): { skyBrightness?: number; skyClass?: SkyClass; skyRank?: number } {
  const sky: { skyBrightness?: number; skyClass?: SkyClass; skyRank?: number } = {}
  if (typeof item.skyBrightness === "number" && Number.isFinite(item.skyBrightness)) {
    sky.skyBrightness = item.skyBrightness
  }
  if (typeof item.skyClass === "string" && SKY_CLASSES.includes(item.skyClass)) {
    sky.skyClass = item.skyClass as SkyClass
  }
  if (typeof item.skyRank === "number" && Number.isInteger(item.skyRank) && item.skyRank >= 1 && item.skyRank <= 100) {
    sky.skyRank = item.skyRank
  }
  return sky
}
