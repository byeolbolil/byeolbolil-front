import { useId } from "react"
import { windowHours } from "@/lib/tonight/hours"
import { moonLitPath } from "@/lib/tonight/moon"
import type { NightHour, NightPlace } from "@/lib/tonight/types"

const WIDTH = 400
const HEIGHT = 250

/** 글자에서 씨앗 값을 만든다. 같은 장소는 언제나 같은 그림이 된다 */
function seedOf(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** 씨앗에서 0~1 사이의 수를 차례로 뽑는다(mulberry32) */
function randomFrom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface SkyArtProps {
  place: Pick<NightPlace, "type" | "id" | "name" | "bortleClass" | "moonBrightness" | "moon" | "hours" | "bestWindow" | "level">
  /** 밤 띠에서 훑고 있는 시간. 있으면 그 시각의 구름과 달로 그린다 */
  hour?: NightHour
}

/**
 * 사진이 없는 장소의 하늘 그림. 그 장소의 사진인 척하지 않도록 그림으로 그리고, 오늘 밤의 조건을 담는다.
 *
 * 별의 수는 광해 등급이 높을수록, 달이 밝을수록 줄고, 구름은 예보 구름량만큼 하늘을 덮는다.
 * 눈에 보이는 별의 수를 계산한 것은 아니다. 조건이 좋고 나쁨을 한눈에 느끼게 하는 그림이다.
 */
export function SkyArt({ place, hour }: SkyArtProps) {
  const id = useId()
  const random = randomFrom(seedOf(`${place.type}:${place.id}:${place.name}`))

  const dark = place.hours.filter((candidate) => candidate.dark)
  const inWindow = windowHours(place.hours, place.bestWindow)
  const basis = inWindow.length > 0 ? inWindow : dark
  const average = (pick: (candidate: NightHour) => number) =>
    basis.length === 0 ? 0 : basis.reduce((sum, candidate) => sum + pick(candidate), 0) / basis.length
  const cloud = (hour ? hour.cloudCover : basis.length === 0 ? 100 : average((candidate) => candidate.cloudCover)) / 100
  const moonUp = hour ? hour.moonUp : basis.filter((candidate) => candidate.moonUp).length * 2 > basis.length
  const moon = moonUp ? Math.min(1, Math.max(0, place.moonBrightness)) : 0
  const daylight = hour ? !hour.dark : false

  // 등급 1에서 가장 많고 9에서 가장 적다. 달빛이 밝으면 더 준다
  const glow = (Math.min(9, Math.max(1, place.bortleClass)) - 1) / 8
  const starCount = Math.round((150 - 125 * glow) * (1 - 0.55 * moon))
  const stars = Array.from({ length: 150 }, () => ({
    x: random() * WIDTH,
    y: random() * HEIGHT * 0.86,
    r: 0.35 + random() * random() * 1.5,
    o: 0.35 + random() * 0.65,
  })).slice(0, starCount)

  // 능선. 장소마다 모양이 다르다
  const ridge: string[] = []
  let height = HEIGHT * (0.78 + random() * 0.06)
  for (let x = 0; x <= WIDTH; x += 20) {
    height += (random() - 0.5) * 16
    height = Math.min(HEIGHT * 0.9, Math.max(HEIGHT * 0.68, height))
    ridge.push(`${x},${height.toFixed(1)}`)
  }
  const moonX = WIDTH * (0.62 + random() * 0.22)
  const moonY = HEIGHT * (0.18 + random() * 0.16)

  // 구름. 구름량이 늘수록 덩어리가 많아지고 짙어진다
  const cloudCount = Math.round(cloud * 9)
  const clouds = Array.from({ length: 9 }, () => ({
    x: random() * WIDTH,
    y: HEIGHT * (0.12 + random() * 0.55),
    rx: 60 + random() * 80,
    ry: 16 + random() * 22,
  })).slice(0, cloudCount)

  return (
    <svg className="photo art" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="오늘 밤 조건으로 그린 하늘">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={daylight ? "oklch(0.36 0.09 262)" : "oklch(0.13 0.05 270)"} />
          <stop offset="70%" stopColor={daylight ? "oklch(0.5 0.1 250)" : "oklch(0.2 0.07 268)"} />
          <stop offset="100%" stopColor={daylight ? "oklch(0.68 0.1 70)" : "oklch(0.26 0.07 275)"} />
        </linearGradient>
        <radialGradient id={`${id}-city`} cx="50%" cy="100%" r="75%">
          <stop offset="0%" stopColor="oklch(0.82 0.12 70)" stopOpacity={0.75 * glow} />
          <stop offset="100%" stopColor="oklch(0.82 0.12 70)" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-moon`}>
          <stop offset="18%" stopColor="oklch(0.96 0.04 95)" stopOpacity={0.5 * moon} />
          <stop offset="100%" stopColor="oklch(0.96 0.04 95)" stopOpacity={0} />
        </radialGradient>
        <filter id={`${id}-soft`} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill={`url(#${id}-sky)`} />
      {daylight
        ? null
        : stars.map((star, index) => <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="oklch(0.97 0.03 95)" opacity={star.o} />)}
      <rect width={WIDTH} height={HEIGHT} fill={`url(#${id}-city)`} />
      {moon > 0 ? (
        <>
          <circle cx={moonX} cy={moonY} r={30 + moon * 70} fill={`url(#${id}-moon)`} />
          {place.moon ? (
            <>
              <circle cx={moonX} cy={moonY} r={11} fill="oklch(0.3 0.03 268)" />
              <path
                d={moonLitPath(moonX, moonY, 11, place.moon.illuminatedFraction, place.moon.waxing)}
                fill="oklch(0.96 0.04 95)"
              />
            </>
          ) : (
            <circle cx={moonX} cy={moonY} r={11} fill="oklch(0.96 0.04 95)" opacity={0.55 + moon * 0.45} />
          )}
        </>
      ) : null}
      <g filter={`url(#${id}-soft)`} opacity={0.5 + cloud * 0.4}>
        {clouds.map((item, index) => (
          <ellipse key={index} cx={item.x} cy={item.y} rx={item.rx} ry={item.ry} fill="oklch(0.62 0.03 265)" />
        ))}
      </g>
      <polygon points={`0,${HEIGHT} ${ridge.join(" ")} ${WIDTH},${HEIGHT}`} fill="oklch(0.09 0.03 268)" />
    </svg>
  )
}
