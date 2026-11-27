/**
 * 6주 달력(`GET /api/v1/recommendations/moon`)을 화면에 옮기는 함수들. 값은 모두 서버가 준 것이다.
 */
import type { MoonCalendarNight, MoonSpan } from "./api"
import { koreanTime } from "./moon"
import { daysBetween, hourOf } from "./time"

/**
 * 밤들을 일요일부터 시작하는 주 단위 줄로 나눈다. 첫 밤 앞과 마지막 밤 뒤의 빈 칸은 null이다.
 * 날짜는 문자열에서 바로 읽어서 브라우저의 시간대와 상관없다.
 */
export function calendarWeeks(nights: readonly MoonCalendarNight[]): Array<Array<MoonCalendarNight | null>> {
  if (nights.length === 0) return []
  const lead = weekdayIndex(nights[0].date)
  const cells: Array<MoonCalendarNight | null> = [...Array<null>(lead).fill(null), ...nights]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: Array<Array<MoonCalendarNight | null>> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** 0이 일요일 */
function weekdayIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * 모든 칸의 띠가 함께 쓰는 시간 축. 밤이 시작하는 날 정오부터 몇 분 뒤인지로 적는다.
 * 달력에서 가장 일찍 어두워지는 때부터 가장 늦게 밝아지는 때까지를 정시로 넓혀 잡는다.
 * 축을 칸마다 따로 잡지 않는 것은, 같은 자리가 같은 시각이어야 칸끼리 견줄 수 있어서다.
 */
export interface NightFrame {
  start: number
  end: number
}

/** 어두워지는 밤이 하나도 없을 때 쓰는 축. 저녁 6시부터 아침 6시까지 */
const FALLBACK_FRAME: NightFrame = { start: 6 * 60, end: 18 * 60 }

export function nightFrame(nights: readonly MoonCalendarNight[]): NightFrame {
  const darks = nights.flatMap(({ date, dark }) =>
    dark ? [{ start: minutesAfterNoon(date, dark.start), end: minutesAfterNoon(date, dark.end) }] : [],
  )
  if (darks.length === 0) return FALLBACK_FRAME
  const start = Math.min(...darks.map((span) => span.start))
  const end = Math.max(...darks.map((span) => span.end))
  return { start: Math.floor(start / 60) * 60, end: Math.ceil(end / 60) * 60 }
}

/** 그 밤이 시작하는 날(`date`)의 정오부터 `iso`까지 몇 분인지. 적힌 시계 그대로 읽어서 브라우저 시간대와 상관없다 */
export function minutesAfterNoon(date: string, iso: string): number {
  const days = daysBetween(date, iso.slice(0, 10))
  return (days * 24 + hourOf(iso) - 12) * 60 + Number(iso.slice(14, 16))
}

/** 띠 위의 한 구간. 축의 왼쪽 끝이 0, 오른쪽 끝이 1이다 */
export interface StripPart {
  from: number
  to: number
}

/**
 * 한 칸의 띠. `dark`는 하늘이 어두운 구간 전체이고(달이 떠 있어도), `moonless`는 그 가운데 달이 없는 구간이다.
 * 축 밖으로 나간 부분은 잘라 낸다.
 */
export function nightStrip(
  night: Pick<MoonCalendarNight, "date" | "dark" | "moonless">,
  frame: NightFrame,
): { dark?: StripPart; moonless: StripPart[] } {
  const part = (span: MoonSpan): StripPart => {
    const length = frame.end - frame.start
    const at = (iso: string) => Math.min(1, Math.max(0, (minutesAfterNoon(night.date, iso) - frame.start) / length))
    return { from: at(span.start), to: at(span.end) }
  }
  return {
    ...(night.dark ? { dark: part(night.dark) } : {}),
    moonless: night.moonless.map(part).filter((item) => item.to > item.from),
  }
}

/** 자세히 보기의 큰 띠 아래에 적는 눈금. 세 시간마다, 자정이 눈금에 오도록 */
export function frameTicks(frame: NightFrame): Array<{ at: number; label: string }> {
  const step = 3 * 60
  const ticks: Array<{ at: number; label: string }> = []
  for (let minute = Math.ceil(frame.start / step) * step; minute <= frame.end; minute += step) {
    const hour = (12 + minute / 60) % 24
    // 띠의 왼쪽이 저녁, 오른쪽이 아침이라 오전·오후는 자리로 읽힌다. 시는 열두 시간제로 적는다
    const label = hour === 0 ? "자정" : `${hour % 12 || 12}시`
    ticks.push({ at: (minute - frame.start) / (frame.end - frame.start), label })
  }
  return ticks
}

/** 분을 "11시간 20분", "40분"처럼. 0분이면 빈 문자열이다 */
export function durationText(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours && rest) return `${hours}시간 ${rest}분`
  if (hours) return `${hours}시간`
  if (rest) return `${rest}분`
  return ""
}

/** 달 없는 구간을 "저녁 6시 15분 – 새벽 6시 36분"으로. 구간이 둘이면 줄을 나눠 쓰도록 배열로 준다 */
export function moonlessSpansText(night: Pick<MoonCalendarNight, "moonless">): string[] {
  return night.moonless.map((span) => `${koreanTime(span.start)} – ${koreanTime(span.end)}`)
}

/** "12월 12일 토요일 밤". 오늘 밤과 내일 밤은 그렇게 부른다 */
export function calendarNightName(date: string, startDate: string): string {
  const diff = daysBetween(startDate, date)
  if (diff === 0) return "오늘 밤"
  if (diff === 1) return "내일 밤"
  const [, m, d] = date.split("-").map(Number)
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][weekdayIndex(date)]
  return `${m}월 ${d}일 ${weekday}요일 밤`
}
