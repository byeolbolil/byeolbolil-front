/**
 * 자세히 보기에서 숫자 대신 먼저 눈에 들어오게 하는 작은 그림들.
 * 그림은 값을 옮긴 것일 뿐이고 판정은 하지 않는다. 판정은 서버가 준 등급과 주의 사항을 그대로 쓴다.
 */

import { SKY_CLASSES, skyScalePosition } from "@/lib/tonight/sky"
import type { SkyClass } from "@/lib/tonight/types"
import { useId } from "react"
import { moonLitPath } from "@/lib/tonight/moon"
import type { NightMoon } from "@/lib/tonight/types"

const SIZE = 56
const CENTER = SIZE / 2

/** 0~1로 자른다 */
function unit(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** 관측 점수. 고리가 찬 만큼이 점수다 */
export function ScoreRing({ score }: { score: number | null }) {
  const radius = 23
  const length = 2 * Math.PI * radius
  const filled = score === null ? 0 : unit(score / 100) * length
  return (
    <svg className="gauge" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <circle cx={CENTER} cy={CENTER} r={radius} fill="none" stroke="var(--night-3)" strokeWidth={5} />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={radius}
        fill="none"
        stroke="var(--star)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${length}`}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />
      <text x={CENTER} y={CENTER + 5.5} textAnchor="middle" fontSize={16} fontWeight={600} fill="var(--ink)">
        {score === null ? "–" : score}
      </text>
    </svg>
  )
}

/** 별 몇 개가 박힌 밤하늘의 자리. 그림마다 같은 자리에 찍어서 구름이 얼마나 가리는지 비교가 된다 */
const SKY_STARS: ReadonlyArray<readonly [number, number, number]> = [
  [15, 17, 1.3],
  [27, 11, 1],
  [40, 18, 1.4],
  [20, 31, 1],
  [34, 29, 1.2],
  [44, 36, 1],
  [14, 42, 1.1],
  [29, 45, 1.3],
]

/**
 * 구름이 하늘을 얼마나 덮는지. 둥근 하늘을 아래에서부터 구름이 채운다.
 * 넓이가 구름량과 같도록 원의 활꼴 높이를 맞춘다.
 */
export function CloudSky({ cloudCover }: { cloudCover: number | null }) {
  const clipId = useId()
  const radius = 25
  const fraction = cloudCover === null ? 0 : unit(cloudCover / 100)
  // 활꼴의 넓이가 fraction × 원 넓이가 되는 높이를 이분법으로 찾는다
  let low = 0
  let high = 2 * radius
  for (let step = 0; step < 24; step++) {
    const height = (low + high) / 2
    // 높이 h인 활꼴의 중심각은 2·acos((r-h)/r), 넓이는 r²(각 - sin 각)/2다
    const angle = 2 * Math.acos((radius - height) / radius)
    const area = (angle - Math.sin(angle)) / (2 * Math.PI)
    if (area < fraction) low = height
    else high = height
  }
  const level = CENTER + radius - (low + high) / 2
  return (
    <svg className="gauge" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx={CENTER} cy={CENTER} r={radius} />
        </clipPath>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={radius} fill="oklch(0.2 0.07 268)" />
      <g clipPath={`url(#${clipId})`}>
        {SKY_STARS.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="var(--star)" />
        ))}
        {fraction > 0 ? (
          <>
            <rect x={0} y={level} width={SIZE} height={SIZE} fill="var(--cloud)" opacity={0.92} />
            {/* 구름 윗면의 둥근 결 */}
            <circle cx={CENTER - 13} cy={level} r={5} fill="var(--cloud)" opacity={0.92} />
            <circle cx={CENTER - 2} cy={level - 1} r={6.5} fill="var(--cloud)" opacity={0.92} />
            <circle cx={CENTER + 11} cy={level} r={5.5} fill="var(--cloud)" opacity={0.92} />
          </>
        ) : null}
      </g>
      <circle cx={CENTER} cy={CENTER} r={radius} fill="none" stroke="var(--hair)" />
    </svg>
  )
}

/**
 * 달빛의 세기. 달 둘레의 빛 무리가 밝기만큼 커지고 짙어진다. 추천 시간에 달이 없으면 지평선 아래에 흐리게 그린다.
 * 달의 모양(위상)은 그리지 않는다. 서버가 주는 값이 밝기뿐이라 모양을 지어내게 되기 때문이다.
 */
export function MoonGlow({ brightness, up }: { brightness: number; up: boolean }) {
  const glowId = useId()
  const strength = unit(brightness)
  if (!up) {
    return (
      <svg className="gauge" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={CENTER} cy={44} r={11} fill="var(--ink-3)" opacity={0.35} />
        <rect x={0} y={40} width={SIZE} height={SIZE - 40} fill="var(--night-2)" />
        <line x1={6} x2={SIZE - 6} y1={40} y2={40} stroke="var(--ink-3)" strokeWidth={1.4} strokeLinecap="round" />
        {SKY_STARS.slice(0, 5).map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y * 0.75} r={r} fill="var(--star)" />
        ))}
      </svg>
    )
  }
  return (
    <svg className="gauge" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <defs>
        <radialGradient id={glowId}>
          <stop offset="35%" stopColor="oklch(0.95 0.04 95)" stopOpacity={0.15 + strength * 0.6} />
          <stop offset="100%" stopColor="oklch(0.95 0.04 95)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={12 + strength * 15} fill={`url(#${glowId})`} />
      <circle cx={CENTER} cy={CENTER} r={11} fill="oklch(0.95 0.04 95)" opacity={0.45 + strength * 0.55} />
      <circle cx={CENTER - 3} cy={CENTER - 3} r={2.2} fill="oklch(0.8 0.03 95)" opacity={0.5} />
      <circle cx={CENTER + 4} cy={CENTER + 2} r={1.6} fill="oklch(0.8 0.03 95)" opacity={0.5} />
      <circle cx={CENTER - 1} cy={CENTER + 5} r={1.2} fill="oklch(0.8 0.03 95)" opacity={0.5} />
    </svg>
  )
}

/**
 * 달의 모양. 밝은 면을 실제 위상대로 그리고, 달빛이 셀수록 둘레의 빛 무리가 커진다.
 * 떠 있지 않으면 흐리게 그린다. `size`를 주면 작은 아이콘으로도 쓴다.
 */
export function MoonPhase({ moon, brightness, up, size }: { moon: NightMoon; brightness: number; up: boolean; size?: number }) {
  const glowId = useId()
  const strength = up ? unit(brightness) : 0
  const radius = 12
  return (
    <svg
      className="gauge"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      style={size ? { width: size, height: size } : undefined}
      opacity={up ? 1 : 0.45}
    >
      <defs>
        <radialGradient id={glowId}>
          <stop offset="40%" stopColor="oklch(0.95 0.04 95)" stopOpacity={strength * 0.6} />
          <stop offset="100%" stopColor="oklch(0.95 0.04 95)" stopOpacity={0} />
        </radialGradient>
      </defs>
      {strength > 0 ? <circle cx={CENTER} cy={CENTER} r={radius + 2 + strength * 13} fill={`url(#${glowId})`} /> : null}
      {/* 어두운 면도 희미하게 보이게 둔다. 달 전체의 윤곽이 있어야 모양이 읽힌다 */}
      <circle cx={CENTER} cy={CENTER} r={radius} fill="oklch(0.32 0.03 268)" />
      <path d={moonLitPath(CENTER, CENTER, radius, moon.illuminatedFraction, moon.waxing)} fill="oklch(0.95 0.04 95)" />
    </svg>
  )
}

/** 습도. 물방울이 습도만큼 찬다 */
export function HumidityDrop({ humidity }: { humidity: number | null }) {
  const clipId = useId()
  const fraction = humidity === null ? 0 : unit(humidity / 100)
  const top = 6
  const bottom = 50
  const level = bottom - (bottom - top) * fraction
  const drop = "M28 6 C28 6 12 25 12 35 a16 16 0 0 0 32 0 C44 25 28 6 28 6 Z"
  return (
    <svg className="gauge" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={drop} />
        </clipPath>
      </defs>
      <path d={drop} fill="var(--night-3)" />
      <rect x={0} y={level} width={SIZE} height={SIZE} fill="var(--sky-clear)" opacity={0.85} clipPath={`url(#${clipId})`} />
      <path d={drop} fill="none" stroke="var(--hair)" />
    </svg>
  )
}

/**
 * 하늘이 얼마나 어두운지. 은하수가 또렷한 하늘부터 밝은 별만 보이는 하늘까지 다섯 등급을 한 칸씩 놓고, 이곳의 하늘 밝기를 바늘로 짚는다.
 * 칸 안에서도 밝을수록 오른쪽에 온다. 칸의 색은 등급이 오를수록 밝아지는 그림일 뿐이고 실제 밝기에 맞춘 것은 아니다.
 */
export function DarknessScale({ skyBrightness, skyClass }: { skyBrightness?: number; skyClass?: SkyClass }) {
  return (
    <div className="dark-scale" aria-hidden="true">
      <div className="cells">
        {SKY_CLASSES.map((value, index) => (
          <i
            key={value}
            data-here={value === skyClass ? "1" : undefined}
            style={{ background: `color-mix(in oklch, oklch(0.9 0.11 80) ${index * 20 + 6}%, oklch(0.3 0.09 275))` }}
          />
        ))}
        {skyBrightness === undefined ? null : (
          <b className="needle" style={{ left: `${(skyScalePosition(skyBrightness) * 100).toFixed(1)}%` }} />
        )}
      </div>
      <div className="ends">
        <span>어두운 하늘</span>
        <span>밝은 도시</span>
      </div>
    </div>
  )
}
