"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { hourIndexAtFraction, moonUpRange, windowIndexRange } from "@/lib/tonight/hours"
import { hourOf, koreanHour } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { hourSkyText } from "@/lib/tonight/wording"

// 그림의 치수(viewBox 단위). 왼쪽과 오른쪽에 여백 PAD를 두고 한 시간을 CELL 너비로 그린다.
const PAD = 8
const CELL = 46
const TOP = 18
const BAND_HEIGHT = 50
const HEIGHT = 72

const STAR_SPOTS: ReadonlyArray<readonly [number, number, number]> = [
  [-10, -8, 1.6],
  [8, -4, 1.1],
  [-2, 9, 1.3],
  [12, 10, 0.9],
]

interface NightBandProps {
  place: NightPlace
  /** 자세히 보기에서는 훑을 때 점수도 보여준다 */
  showScore: boolean
  /** 훑고 있는 칸 번호. 떼면 null */
  onScrub?: (index: number | null) => void
}

/**
 * 밤 시간 띠. 해 진 뒤부터 해 뜨기 전까지를 한 시간 칸으로 그리고, 맑은 칸에는 별을, 구름 낀 칸에는 구름을 그린다.
 * 추천 시간대는 금색 테두리로 두른다. 띠를 훑으면 그 시각의 하늘 상태가 뜬다.
 */
export function NightBand({ place, showScore, onScrub }: NightBandProps) {
  const { hours } = place
  const count = hours.length
  const width = PAD * 2 + count * CELL
  const gradientId = useId()
  const bandRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)

  const select = (index: number | null) => {
    setActive(index)
    onScrub?.(index)
  }

  // 손가락으로 고른 칸은 띠 밖을 누를 때까지 남겨 둔다
  useEffect(() => {
    if (active === null) return
    const onDown = (event: globalThis.PointerEvent) => {
      if (bandRef.current && event.target instanceof Node && !bandRef.current.contains(event.target)) {
        setActive(null)
        onScrub?.(null)
      }
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [active, onScrub])

  if (count === 0) return null

  const indexAt = (event: PointerEvent<HTMLDivElement>): number => {
    const rect = plotRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    const x = ((event.clientX - rect.left) / rect.width) * width
    return hourIndexAtFraction((x - PAD) / (count * CELL), count)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault()
      const step = event.key === "ArrowRight" ? 1 : -1
      const from = active ?? (step > 0 ? -1 : count)
      select(Math.min(count - 1, Math.max(0, from + step)))
    } else if (event.key === "Escape") {
      select(null)
    }
  }

  const firstDark = hours.findIndex((hour) => hour.dark)
  const tipText = (index: number): string => {
    const hour = hours[index]
    const beforeDark = firstDark < 0 ? hourOf(hour.time) >= 12 : index < firstDark
    const parts = [hourSkyText(hour, beforeDark), `구름 ${hour.cloudCover}%`]
    if (hour.moonUp) parts.push("달 떠 있음")
    if (showScore && hour.dark) parts.push(`점수 ${hour.score}`)
    return parts.join(" · ")
  }

  const best = windowIndexRange(hours, place.bestWindow)
  const moon = moonUpRange(hours)
  const centerPercent = (index: number) => ((PAD + (index + 0.5) * CELL) / width) * 100
  const labels = hours
    .map((hour, index) => ({ index, hour: hourOf(hour.time) }))
    .filter(({ hour }) => hour % 3 === 0)

  return (
    <div>
      <div
        ref={bandRef}
        className="band"
        role="slider"
        tabIndex={0}
        aria-label="시간대별 하늘 상태. 좌우 화살표로 시간을 옮깁니다"
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={active ?? 0}
        aria-valuetext={active === null ? "고른 시간 없음" : `${koreanHour(hourOf(hours[active].time))}, ${tipText(active)}`}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => select(indexAt(event))}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || event.buttons > 0 || event.pressure > 0) select(indexAt(event))
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") select(null)
        }}
        onBlur={() => select(null)}
      >
        <div ref={plotRef} style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${width} ${HEIGHT}`} aria-hidden="true">
            <defs>
              <linearGradient id={gradientId} x1="0" x2="1">
                <stop offset="0" stopColor="var(--dusk)" />
                <stop offset="0.1" stopColor="var(--night-2)" />
                <stop offset="0.9" stopColor="var(--night-2)" />
                <stop offset="1" stopColor="var(--dusk)" />
              </linearGradient>
            </defs>
            <rect x={PAD} y={TOP} width={count * CELL} height={BAND_HEIGHT} rx={12} fill={`url(#${gradientId})`} />
            {hours.map((hour, index) => {
              const cx = PAD + index * CELL + CELL / 2
              const cy = TOP + BAND_HEIGHT / 2
              if (hour.clear) {
                const spots = STAR_SPOTS.slice(0, 2 + (((index * 7 + place.id) % 5) % 3))
                return (
                  <g key={hour.time}>
                    {spots.map(([dx, dy, r]) => (
                      <circle key={`${dx},${dy}`} cx={cx + dx} cy={cy + dy} r={r} fill="var(--star)" opacity={0.5 + hour.score / 220} />
                    ))}
                  </g>
                )
              }
              if (hour.cloudCover === 0) return null
              const scale = 0.5 + hour.cloudCover / 180
              return (
                <g
                  key={hour.time}
                  transform={`translate(${cx},${cy + 2}) scale(${scale.toFixed(2)})`}
                  fill="var(--cloud)"
                  opacity={(0.08 + hour.cloudCover / 125).toFixed(2)}
                >
                  <circle cx={-7} cy={2} r={6} />
                  <circle cx={1} cy={-3} r={8} />
                  <circle cx={9} cy={2} r={6} />
                  <rect x={-13} y={2} width={28} height={7} rx={3.5} />
                </g>
              )
            })}
            {best ? (
              <rect
                x={PAD + best[0] * CELL + 1.5}
                y={TOP + 1.5}
                width={(best[1] - best[0] + 1) * CELL - 3}
                height={BAND_HEIGHT - 3}
                rx={11}
                fill="none"
                stroke="var(--star)"
                strokeWidth={2}
              />
            ) : null}
            {moon ? (
              <>
                <line
                  x1={PAD + moon[0] * CELL + 6}
                  x2={PAD + (moon[1] + 1) * CELL - 6}
                  y1={8}
                  y2={8}
                  stroke="var(--star)"
                  strokeOpacity={0.25 + place.moonBrightness * 0.5}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <g transform={`translate(${PAD + moon[0] * CELL + 6},8)`}>
                  <circle r={6} fill="var(--night-1)" />
                  <path d="M3.5,-5 A5.5,5.5 0 1 0 3.5,5 A4.2,4.2 0 1 1 3.5,-5Z" fill="var(--star)" />
                </g>
              </>
            ) : null}
          </svg>
          {active !== null ? (
            <>
              <div
                className="band-cursor"
                style={{
                  left: `${centerPercent(active)}%`,
                  top: `${(TOP / HEIGHT) * 100}%`,
                  height: `${(BAND_HEIGHT / HEIGHT) * 100}%`,
                }}
              />
              <div className="band-tip" style={{ left: `${Math.min(80, Math.max(20, centerPercent(active)))}%` }}>
                <b>{koreanHour(hourOf(hours[active].time))}</b> · {tipText(active)}
              </div>
            </>
          ) : null}
        </div>
        <div className="band-axis" aria-hidden="true">
          {labels.map(({ index, hour }, order) => {
            const edge = index === 0 ? "first" : index === count - 1 ? "last" : ""
            const left = edge === "first" ? 0 : edge === "last" ? 100 : centerPercent(index)
            return (
              <span key={index} className={[edge, order % 2 ? "alt" : ""].filter(Boolean).join(" ")} style={{ left: `${left}%` }}>
                {koreanHour(hour)}
              </span>
            )
          })}
        </div>
      </div>
      <div className="band-hint">시간 띠를 훑어 보면 시간별 하늘이 보여요</div>
    </div>
  )
}
