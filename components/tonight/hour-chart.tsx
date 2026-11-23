import { preferBeforeIndex, windowIndexRange } from "@/lib/tonight/hours"
import { CLEAR_CLOUD_COVER_MAX } from "@/lib/tonight/policy"
import { hourOf } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"

// 그림의 치수(viewBox 단위)
const LEFT = 46
const CELL = 44
const TOP = 14
const CLOUD_ZONE = 60
const SCORE_BASE = 150
const SCORE_ZONE = 52
const HEIGHT = 178

interface HourChartProps {
  place: NightPlace
  /** 밤이 시작하는 날짜 */
  nightDate: string
  /** 선호 시각(HH:mm). 그 자리에 세로 점선을 긋는다 */
  preferBefore: string
}

/** 시간대별 구름량 막대와 관측 점수 선. 추천 시간대는 테두리로 두르고, 맑다고 보는 구름량에 가로 점선을 긋는다. */
export function HourChart({ place, nightDate, preferBefore }: HourChartProps) {
  const { hours } = place
  const count = hours.length
  if (count === 0) return null
  const width = LEFT + count * CELL + 10
  const best = windowIndexRange(hours, place.bestWindow)
  const cut = preferBeforeIndex(hours, nightDate, preferBefore)
  const clearY = TOP + (CLOUD_ZONE * CLEAR_CLOUD_COVER_MAX) / 100
  const points = hours.map((hour, index) => [LEFT + index * CELL + CELL / 2, SCORE_BASE - (SCORE_ZONE * hour.score) / 100] as const)
  const line = points.map(([x, y]) => `${x},${y}`).join(" L")

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label="시간대별 구름량과 관측 점수">
        {best ? (
          <rect
            x={LEFT + best[0] * CELL + 1}
            y={TOP - 4}
            width={(best[1] - best[0] + 1) * CELL - 2}
            height={SCORE_BASE - TOP + 8}
            rx={6}
            fill="none"
            stroke="var(--star)"
            strokeOpacity={0.6}
          />
        ) : null}
        <text x={LEFT - 8} y={TOP + CLOUD_ZONE / 2 + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">
          구름
        </text>
        <text x={LEFT - 8} y={SCORE_BASE - SCORE_ZONE / 2 + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)">
          점수
        </text>
        {hours.map((hour, index) => {
          const barHeight = Math.max(1.5, (CLOUD_ZONE * hour.cloudCover) / 100)
          return (
            <g key={hour.time}>
              <rect
                x={LEFT + index * CELL + 8}
                y={TOP}
                width={CELL - 16}
                height={barHeight}
                rx={3}
                fill="var(--cloud)"
                opacity={hour.dark ? 0.75 : 0.3}
              />
              <text x={LEFT + index * CELL + CELL / 2} y={TOP + barHeight + 11} textAnchor="middle" fontSize={9.5} fill="var(--ink-3)">
                {hour.cloudCover}
              </text>
            </g>
          )
        })}
        <line x1={LEFT} x2={LEFT + count * CELL} y1={clearY} y2={clearY} stroke="var(--sky-clear)" strokeDasharray="3 3" opacity={0.7} />
        <line x1={LEFT} x2={LEFT + count * CELL} y1={SCORE_BASE} y2={SCORE_BASE} stroke="var(--hair)" />
        <path
          d={`M${points[0][0]},${SCORE_BASE} L${line} L${points[count - 1][0]},${SCORE_BASE} Z`}
          fill="var(--star)"
          opacity={0.15}
        />
        <path d={`M${line}`} fill="none" stroke="var(--star)" strokeWidth={1.8} />
        {hours.map((hour, index) => (
          <g key={hour.time}>
            {hour.score > 0 ? (
              <text x={points[index][0]} y={points[index][1] - 6} textAnchor="middle" fontSize={9.5} fill="var(--ink-2)">
                {hour.score}
              </text>
            ) : null}
            <text x={LEFT + index * CELL + CELL / 2} y={HEIGHT - 4} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)">
              {String(hourOf(hour.time)).padStart(2, "0")}
            </text>
          </g>
        ))}
        {cut !== null ? (
          <line
            x1={LEFT + cut * CELL}
            x2={LEFT + cut * CELL}
            y1={TOP - 6}
            y2={HEIGHT - 16}
            stroke="var(--ink-2)"
            strokeDasharray="2 4"
          />
        ) : null}
      </svg>
    </div>
  )
}
