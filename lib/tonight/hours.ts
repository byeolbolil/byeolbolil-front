/**
 * 시간 칸 배열에서 화면에 필요한 값을 뽑는 함수들. 예보에 없는 값을 만들어 내지 않고, 받은 칸을 고르거나 평균만 낸다.
 */
import type { ClearWindow, NightHour, NightPlace } from "./types"

const HOUR_MS = 3_600_000

/** 고른 시각의 칸. 그 시각의 예보가 없는 장소는 `undefined`다. 장소마다 해 지는 시각이 달라 칸의 범위가 다를 수 있다. */
export function hourAt(hours: readonly NightHour[], time: string): NightHour | undefined {
  const target = Date.parse(time)
  return hours.find((hour) => Date.parse(hour.time) === target)
}

/** 띠 위의 가로 위치(0~1)를 칸 번호로 바꾼다. 양 끝을 벗어나면 첫 칸이나 마지막 칸이다. */
export function hourIndexAtFraction(fraction: number, count: number): number {
  if (count <= 0) return -1
  return Math.min(count - 1, Math.max(0, Math.floor(fraction * count)))
}

/** 여러 장소의 칸 시각을 모아 시간순으로 늘어놓는다. 지도의 시간 슬라이더가 이 목록을 쓴다. */
export function hourTimeline(places: readonly Pick<NightPlace, "hours">[]): string[] {
  const byInstant = new Map<number, string>()
  for (const place of places) {
    for (const hour of place.hours) {
      const instant = Date.parse(hour.time)
      if (!byInstant.has(instant)) byInstant.set(instant, hour.time)
    }
  }
  return [...byInstant.entries()].sort((a, b) => a[0] - b[0]).map(([, time]) => time)
}

/** 슬라이더가 처음 가리킬 시각. 추천 시간이 있으면 그 시작, 없으면 첫 어두운 칸, 그것도 없으면 첫 칸이다. */
export function initialTimelineTime(timeline: readonly string[], place: NightPlace | undefined): string | undefined {
  if (timeline.length === 0) return undefined
  const preferred = place?.bestWindow?.start ?? place?.hours.find((hour) => hour.dark)?.time
  if (preferred) {
    const target = Date.parse(preferred)
    const found = timeline.find((time) => Date.parse(time) === target)
    if (found) return found
  }
  return timeline[0]
}

/** 추천 시간대에 드는 칸들. */
export function windowHours(hours: readonly NightHour[], window: ClearWindow | undefined): NightHour[] {
  if (!window) return []
  const start = Date.parse(window.start)
  const end = Date.parse(window.end)
  return hours.filter((hour) => {
    const t = Date.parse(hour.time)
    return t >= start && t < end
  })
}

/** 칸 번호로 본 추천 시간대의 범위 [첫 칸, 마지막 칸]. 없으면 `null`. */
export function windowIndexRange(hours: readonly NightHour[], window: ClearWindow | undefined): [number, number] | null {
  if (!window) return null
  const start = Date.parse(window.start)
  const end = Date.parse(window.end)
  let first = -1
  let last = -1
  hours.forEach((hour, index) => {
    const t = Date.parse(hour.time)
    if (t >= start && t < end) {
      if (first < 0) first = index
      last = index
    }
  })
  return first < 0 ? null : [first, last]
}

/** 평균을 반올림한 값. 칸이 없으면 `null`. */
export function average(hours: readonly NightHour[], pick: (hour: NightHour) => number): number | null {
  if (hours.length === 0) return null
  return Math.round(hours.reduce((sum, hour) => sum + pick(hour), 0) / hours.length)
}

/** 서버가 맑다고 판정한 칸이 이어진 구간들. 시간순이다. */
export function clearRuns(hours: readonly NightHour[]): ClearWindow[] {
  const runs: ClearWindow[] = []
  let startIndex = -1
  const close = (endIndex: number) => {
    const start = hours[startIndex].time
    const endMs = Date.parse(hours[endIndex].time) + HOUR_MS
    runs.push({ start, end: shiftIso(hours[endIndex].time, endMs), hours: endIndex - startIndex + 1 })
    startIndex = -1
  }
  hours.forEach((hour, index) => {
    const continues = index > 0 && Date.parse(hour.time) - Date.parse(hours[index - 1].time) === HOUR_MS
    if (startIndex >= 0 && (!hour.clear || !continues)) close(index - 1)
    if (hour.clear && startIndex < 0) startIndex = index
  })
  if (startIndex >= 0) close(hours.length - 1)
  return runs
}

/** `like`와 같은 UTC 오프셋 표기로 `instantMs`를 적는다. API가 주는 +09:00 표기를 그대로 잇기 위한 것이다. */
function shiftIso(like: string, instantMs: number): string {
  const offset = like.slice(19)
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset)
  const offsetMs = match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) * 60_000 : 0
  const local = new Date(instantMs + offsetMs).toISOString().slice(0, 19)
  return `${local}${match ? offset : "Z"}`
}

export type MoonSummary =
  | { kind: "NO_MOON" }
  | { kind: "BRIGHT" }
  | { kind: "SETS_EARLY"; darkFrom: string }
  | { kind: "RISES_LATE"; darkUntil: string }
  | { kind: "UP_ALL_NIGHT" }

/**
 * 어두운 시간 동안 달이 어떻게 떠 있는지. 달이 밝아서 등급을 내렸는지는 서버가 `BRIGHT_MOON`으로 알려 주므로
 * 여기서는 밝기 기준을 다시 판단하지 않는다. 어두운 칸이 없으면 `null`이다.
 */
export function moonSummary(place: Pick<NightPlace, "hours" | "notes">): MoonSummary | null {
  const dark = place.hours.filter((hour) => hour.dark)
  if (dark.length === 0) return null
  if (!dark.some((hour) => hour.moonUp)) return { kind: "NO_MOON" }
  if (place.notes.includes("BRIGHT_MOON")) return { kind: "BRIGHT" }
  const first = dark[0]
  const last = dark[dark.length - 1]
  if (first.moonUp && !last.moonUp) {
    const firstDown = dark.find((hour) => !hour.moonUp)
    return firstDown ? { kind: "SETS_EARLY", darkFrom: firstDown.time } : { kind: "UP_ALL_NIGHT" }
  }
  if (!first.moonUp) {
    const firstUp = dark.find((hour) => hour.moonUp)
    return firstUp ? { kind: "RISES_LATE", darkUntil: firstUp.time } : { kind: "NO_MOON" }
  }
  return { kind: "UP_ALL_NIGHT" }
}

/** 달이 떠 있는 칸의 범위 [첫 칸, 마지막 칸]. 밤 띠 위에 달 줄을 그릴 때 쓴다. */
export function moonUpRange(hours: readonly NightHour[]): [number, number] | null {
  let first = -1
  let last = -1
  hours.forEach((hour, index) => {
    if (hour.moonUp) {
      if (first < 0) first = index
      last = index
    }
  })
  return first < 0 ? null : [first, last]
}

/**
 * 선호 시각(`preferBefore`, HH:mm)이 놓이는 칸 번호. 그 칸부터는 선호 시각 뒤다.
 * 서버와 같은 규칙으로 읽는다: 정오 전 시각은 밤이 시작한 다음 날의 시각이다. 밤 안에 놓이지 않으면 `null`이다.
 */
export function preferBeforeIndex(hours: readonly NightHour[], nightDate: string, preferBefore: string): number | null {
  if (hours.length === 0) return null
  const [h, m] = preferBefore.split(":").map(Number)
  const [y, mo, d] = nightDate.split("-").map(Number)
  const dayOffset = h < 12 ? 1 : 0
  // 한국 시간(+09:00)으로 적힌 시각을 순간으로 바꾼다
  const cutoff = Date.UTC(y, mo - 1, d + dayOffset, h - 9, m)
  const index = hours.findIndex((hour) => Date.parse(hour.time) >= cutoff)
  return index <= 0 ? null : index
}
