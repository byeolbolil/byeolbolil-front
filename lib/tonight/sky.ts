/**
 * 하늘 밝기를 화면의 말과 그림으로 옮긴다.
 *
 * 하늘 밝기는 하늘 전체에서 평균한 인공 불빛이 자연 밤하늘 밝기의 몇 배인지다(ALR). 서버가 위성 자료에서 계산해 주고
 * 등급(`skyClass`)도 서버가 정한다. 여기 있는 경계값은 눈금과 그림을 그리는 데만 쓴다.
 * 경계 0.33, 2, 10은 Duriscoe et al., JQSRT 214, 133 (2018)의 표 3이고, 50은 Falchi et al., Science Advances 2,
 * e1600377 (2016)의 "눈이 어둠에 적응하지 못하는 밝기"를 옮긴 어림값이다. 백엔드 저장소 docs/SCORING.md "광해"에 있다.
 */
import type { SkyClass } from "./types"

/** 어두운 쪽부터 */
export const SKY_CLASSES: readonly SkyClass[] = ["NATURAL", "DARK", "RURAL", "SUBURBAN", "URBAN"]

/** 등급 사이의 경계. 이 값부터 다음 등급이다 */
const BOUNDS = [0.33, 2, 10, 50] as const

/** 눈금의 양 끝. 이보다 어둡거나 밝은 값은 끝에 붙인다 */
const SCALE_MIN = 0.05
const SCALE_MAX = 250

/** 등급 이름. 별볼일이 붙인 이름이다 */
const SKY_NAME: Record<SkyClass, string> = {
  NATURAL: "자연 그대로의 하늘",
  DARK: "어두운 하늘",
  RURAL: "시골 하늘",
  SUBURBAN: "교외 하늘",
  URBAN: "도시 하늘",
}

const SKY_HINT: Record<SkyClass, string> = {
  NATURAL: "인공 불빛이 거의 닿지 않아요",
  DARK: "지평선 쪽에만 불빛이 비쳐요",
  RURAL: "은하수가 보이지만 불빛이 번져 있어요",
  SUBURBAN: "은하수는 보이지 않아요",
  URBAN: "밝은 별만 보여요",
}

export function skyName(skyClass: SkyClass | undefined): string {
  return skyClass ? SKY_NAME[skyClass] : "하늘 밝기를 모르는 곳"
}

/** 그 등급의 하늘에서 무엇이 보이는지 한마디 */
export function skyHint(skyClass: SkyClass | undefined): string {
  return skyClass ? SKY_HINT[skyClass] : ""
}

/** "인공 불빛이 자연 밤하늘의 약 4배예요". 모형으로 계산한 값이라 어림으로 말한다 */
export function skyBrightnessText(skyBrightness: number | undefined): string {
  if (skyBrightness === undefined) return "이곳의 하늘 밝기 자료가 없어요"
  if (skyBrightness < 0.1) return "인공 불빛이 거의 없어요"
  if (skyBrightness < 1) return `인공 불빛이 자연 밤하늘의 ${Math.round(skyBrightness * 10) * 10}%쯤이에요`
  return `인공 불빛이 자연 밤하늘의 약 ${multiple(skyBrightness)}배예요`
}

function multiple(value: number): string {
  if (value >= 10) return String(Math.round(value))
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/**
 * 하늘이 불빛으로 밝아진 정도를 0(자연 상태)에서 1(도시)로. 서버가 점수를 깎을 때와 같은 눈금이다.
 * 하늘 밝기를 모르는 곳은 서버와 같이 2로 본다.
 */
export function skyGlow(skyBrightness: number | undefined): number {
  const value = skyBrightness ?? 2
  if (value <= BOUNDS[0]) return 0
  return Math.min(1, Math.log(value / BOUNDS[0]) / Math.log(BOUNDS[3] / BOUNDS[0]))
}

/**
 * 다섯 칸짜리 눈금에서의 위치를 0에서 1로. 칸마다 한 등급이고, 칸 안에서는 밝기의 로그로 자리를 잡는다.
 */
export function skyScalePosition(skyBrightness: number): number {
  const edges = [SCALE_MIN, ...BOUNDS, SCALE_MAX]
  const value = Math.min(SCALE_MAX, Math.max(SCALE_MIN, skyBrightness))
  for (let cell = 0; cell < edges.length - 1; cell += 1) {
    const low = edges[cell]
    const high = edges[cell + 1]
    if (value <= high) {
      const within = Math.log(value / low) / Math.log(high / low)
      return (cell + Math.min(1, Math.max(0, within))) / (edges.length - 1)
    }
  }
  return 1
}
