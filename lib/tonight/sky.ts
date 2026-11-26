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

/**
 * 등급 이름. 그 하늘에서 은하수가 어떻게 보이는지로 붙인다. 아래 세 등급은 Duriscoe et al. 2018 표 3이 묶은 Bortle 등급
 * (1~3, 4, 5)의 설명을, 위 두 등급은 Falchi et al. 2016의 은하수 가시 한계와 "눈이 어둠에 적응하지 못하는 밝기"를 따른다.
 * 백엔드 저장소 docs/SCORING.md "광해"에 있다.
 */
const SKY_NAME: Record<SkyClass, string> = {
  NATURAL: "은하수가 또렷한 하늘",
  DARK: "은하수가 잘 보이는 하늘",
  RURAL: "은하수가 보이는 하늘",
  SUBURBAN: "은하수가 안 보이는 하늘",
  URBAN: "밝은 별만 보이는 하늘",
}

const SKY_HINT: Record<SkyClass, string> = {
  NATURAL: "인공 불빛이 거의 닿지 않아 은하수의 무늬까지 보여요",
  DARK: "지평선 몇 군데에만 불빛이 비쳐요",
  RURAL: "머리 위에서는 보이지만 흐리고, 지평선 쪽은 불빛에 묻혀요",
  SUBURBAN: "밝은 별과 별자리는 보여요",
  URBAN: "눈이 어둠에 적응하지 못할 만큼 밝아요",
}

export function skyName(skyClass: SkyClass | undefined): string {
  return skyClass ? SKY_NAME[skyClass] : "하늘 밝기를 모르는 곳"
}

/** 그 등급의 하늘에서 무엇이 보이는지 한마디 */
export function skyHint(skyClass: SkyClass | undefined): string {
  return skyClass ? SKY_HINT[skyClass] : ""
}

/**
 * 국내에서 얼마나 어두운 편인지. 등급이 미국 국립공원 기준이라 한국은 거의 두 등급에 몰리므로 순위로 따로 말한다.
 * 순위는 서버가 남한 땅을 하늘이 어두운 순서로 백 칸으로 나눠 준 값이다.
 */
export function skyRankText(skyRank: number | undefined): string {
  if (skyRank === undefined) return ""
  if (skyRank <= 50) return `국내 상위 ${skyRank}%의 어두운 하늘이에요`
  return `국내 땅의 ${skyRank - 1}%가 이곳보다 어두워요`
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
