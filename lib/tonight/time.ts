/**
 * 시각을 화면 문구로 바꾸는 함수들.
 *
 * API의 시각은 모두 `2026-11-24T19:00:00+09:00`처럼 한국 시간으로 적힌 문자열이다. 브라우저의 시간대와 상관없이
 * 한국 시간으로 보여야 하므로 `Date`로 바꾸지 않고 문자열에서 시와 날짜를 바로 읽는다.
 */

const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"] as const

/** ISO 문자열에 적힌 시(0~23). */
export function hourOf(iso: string): number {
  return Number(iso.slice(11, 13))
}

/** ISO 문자열에 적힌 날짜(yyyy-MM-dd). */
export function dateOf(iso: string): string {
  return iso.slice(0, 10)
}

/** 0~23시를 "밤 9시", "자정", "새벽 2시"처럼 읽는다. */
export function koreanHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  if (h === 0) return "자정"
  if (h <= 5) return `새벽 ${h}시`
  if (h < 12) return `아침 ${h}시`
  if (h === 12) return "낮 12시"
  if (h <= 16) return `오후 ${h - 12}시`
  if (h <= 20) return `저녁 ${h - 12}시`
  return `밤 ${h - 12}시`
}

/**
 * 시각을 그 시각이 든 날짜와 함께 "11/28 밤 11시", "11/29 새벽 1시"처럼 읽는다.
 * 밤 이름("내일 밤")은 저녁부터 다음 날 아침까지를 한 밤으로 부르는 것이라, 자정을 넘긴 시각에 붙이면 날짜로 읽혀 거꾸로 가는 것처럼 보인다.
 * 자정은 흔히 말하듯 그 전날에 붙여 "11/28 자정"이라 한다. 그래야 밤 11시, 자정, 새벽 1시가 날짜와 함께 차례로 읽힌다.
 */
export function dayHourText(iso: string): string {
  return `${shortDate(dateOfHour(iso))} ${koreanHour(hourOf(iso))}`
}

/** `dayHourText`의 날짜를 요일과 함께. "11/29 (일)" */
export function dayOfHour(iso: string): string {
  const date = dateOfHour(iso)
  return `${shortDate(date)} (${weekdayOf(date).slice(0, 1)})`
}

/** 시각이 든 날짜. 자정은 그 전날이다 */
function dateOfHour(iso: string): string {
  return hourOf(iso) === 0 ? addDays(dateOf(iso), -1) : dateOf(iso)
}

/** 추천 시간대를 "저녁 7시 – 새벽 2시"로 적는다. */
export function windowText(window: { start: string; end: string }): string {
  return `${koreanHour(hourOf(window.start))} – ${koreanHour(hourOf(window.end))}`
}

/** "HH:mm"을 화면 문구로. 분이 0이 아니면 분까지 적는다. */
export function koreanClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number)
  return m ? `${koreanHour(h)} ${m}분` : koreanHour(h)
}

/** yyyy-MM-dd에 날짜를 더한다. 시간대의 영향을 받지 않도록 UTC로 계산한다. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}

/** 두 날짜 사이의 일수 (to - from). */
export function daysBetween(from: string, to: string): number {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((ms(to) - ms(from)) / 86_400_000)
}

export function weekdayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** "11/24"처럼 짧게 적은 날짜. */
export function shortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number)
  return `${m}/${d}`
}

/**
 * 밤의 이름. 오늘 밤의 날짜(`tonight`)를 기준으로 "오늘 밤", "내일 밤", 그 뒤는 "목요일 밤"이다.
 * 오늘 밤이 어느 날짜인지는 서버가 정한다(새벽 4시 전에는 전날).
 */
export function nightName(date: string, tonight: string): string {
  const diff = daysBetween(tonight, date)
  if (diff === 0) return "오늘 밤"
  if (diff === 1) return "내일 밤"
  return `${weekdayOf(date)} 밤`
}

/** 밤 고르기 버튼에 쓰는 짧은 이름. */
export function nightTabLabel(date: string, tonight: string): string {
  const diff = daysBetween(tonight, date)
  if (diff === 0) return "오늘 밤"
  if (diff === 1) return "내일 밤"
  return weekdayOf(date)
}

/** 좁은 칸에 쓰는 한두 글자 이름. "오늘", "내일", 그 뒤로는 요일의 첫 글자("일", "월") */
export function shortNightLabel(date: string, tonight: string): string {
  const diff = daysBetween(tonight, date)
  if (diff === 0) return "오늘"
  if (diff === 1) return "내일"
  return weekdayOf(date).slice(0, 1)
}

/** 오늘 밤부터 고를 수 있는 날짜들. API는 오늘 밤부터 7일을 받는다. */
export function nightDates(tonight: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => addDays(tonight, i))
}

/** 예보가 만들어진 시각을 "11/23 밤 9시"로 적는다. */
export function issuedAtText(iso: string): string {
  return `${shortDate(dateOf(iso))} ${koreanHour(hourOf(iso))}`
}
