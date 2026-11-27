/**
 * 6주 달력(`GET /api/v1/recommendations/moon`)을 화면에 옮기는 함수들. 값은 모두 서버가 준 것이다.
 */
import type { MoonCalendarNight, MoonSpan } from "./api"
import { koreanTime } from "./moon"
import { daysBetween } from "./time"

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
 * 칸 아래 막대의 길이(0~1). 달 없이 어두운 시간을 이 달력에서 가장 긴 어두운 밤에 견준다.
 * 밤의 길이로 나누지 않는 것은, 여름의 짧은 밤이 가득 찬 막대로 보이지 않게 하려는 것이다.
 */
export function moonlessShare(night: MoonCalendarNight, nights: readonly MoonCalendarNight[]): number {
  const longest = Math.max(0, ...nights.map((item) => (item.dark ? spanMinutes(item.dark) : 0)))
  if (longest === 0) return 0
  return Math.min(1, Math.max(0, night.moonlessMinutes / longest))
}

function spanMinutes(span: MoonSpan): number {
  return Math.round((Date.parse(span.end) - Date.parse(span.start)) / 60_000)
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
