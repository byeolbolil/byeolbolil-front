/**
 * 달의 모양과 뜨고 지는 시각을 화면에 옮기는 함수들.
 * 값은 모두 서버가 준 것이다(`moon.illuminatedFraction`, `moon.waxing`, `moon.rise`, `moon.set`).
 */
import { hourOf, koreanHour } from "./time"
import type { NightMoon } from "./types"

/**
 * 달에서 밝게 보이는 부분의 SVG 경로. 바깥쪽 반원과, 밝은 면과 어두운 면의 경계(타원의 반쪽)로 둘러싼다.
 * 북반구에서 보는 모양이라 차오르는 달은 오른쪽이, 기우는 달은 왼쪽이 밝다.
 */
export function moonLitPath(cx: number, cy: number, radius: number, fraction: number, waxing: boolean): string {
  const f = Math.min(1, Math.max(0, fraction))
  // 경계 타원의 가로 반지름. 반달일 때 0(직선), 삭과 보름일 때 반지름과 같다
  const rx = (radius * Math.abs(1 - 2 * f)).toFixed(2)
  const top = `${cx},${cy - radius}`
  const bottom = `${cx},${cy + radius}`
  // SVG의 sweep 1은 시계 방향이다. 위에서 오른쪽을 지나 아래로 가는 것이 시계 방향이다
  const outerSweep = waxing ? 1 : 0
  // 경계는 아래에서 위로 돌아온다. 반보다 덜 찼으면 밝은 쪽으로, 더 찼으면 어두운 쪽으로 불룩하다
  const bulgesToLitSide = f < 0.5
  const terminatorSweep = waxing === bulgesToLitSide ? 0 : 1
  return `M${top} A${radius},${radius} 0 0 ${outerSweep} ${bottom} A${rx},${radius} 0 0 ${terminatorSweep} ${top} Z`
}

/**
 * 달 모양의 이름. 밝은 면의 비율을 어디서 끊어 부를지는 정해진 기준이 없어서 흔히 쓰는 말에 맞춰 나눴다.
 * 화면의 문구일 뿐이고 판정에는 쓰지 않는다.
 */
export function moonPhaseName(moon: Pick<NightMoon, "illuminatedFraction" | "waxing">): string {
  const f = moon.illuminatedFraction
  if (f < 0.03) return "달이 거의 없는 그믐"
  if (f >= 0.97) return "보름달"
  if (f < 0.35) return moon.waxing ? "초승달" : "그믐달"
  if (f < 0.65) return moon.waxing ? "상현달" : "하현달"
  return moon.waxing ? "차오르는 달" : "기우는 달"
}

/** ISO 시각을 "저녁 4시 28분"처럼 읽는다. 분이 0이면 시만 적는다 */
export function koreanTime(iso: string): string {
  const minute = Number(iso.slice(14, 16))
  if (!minute) return koreanHour(hourOf(iso))
  // 자정을 넘긴 0시대는 "자정 32분"이 아니라 "밤 12시 32분"으로 읽는다
  const hour = hourOf(iso) === 0 ? "밤 12시" : koreanHour(hourOf(iso))
  return `${hour} ${minute}분`
}

/** 한낮(오전 10시부터 오후 3시 전)에 일어나는 일인지. 별을 보는 사람에게는 쓸모가 없는 시각이다 */
function isMidday(iso: string): boolean {
  const hour = hourOf(iso)
  return hour >= 10 && hour < 15
}

/**
 * 달이 뜨고 지는 시각을 한 문장으로. 먼저 일어나는 일부터 적는다.
 * 한낮에 뜨거나 지는 것은 밤하늘과 상관없어서 뺀다. 남는 것이 없으면 빈 문자열이다.
 */
export function moonTimesText(moon: Pick<NightMoon, "rise" | "set"> | undefined): string {
  if (!moon) return ""
  const rise = moon.rise && !isMidday(moon.rise) ? moon.rise : undefined
  const set = moon.set && !isMidday(moon.set) ? moon.set : undefined
  if (rise && set) {
    return Date.parse(rise) < Date.parse(set)
      ? `${koreanTime(rise)}에 떠서 ${koreanTime(set)}에 져요`
      : `${koreanTime(set)}에 지고 ${koreanTime(rise)}에 다시 떠요`
  }
  if (rise) return `${koreanTime(rise)}에 떠요`
  if (set) return `${koreanTime(set)}에 져요`
  return ""
}
