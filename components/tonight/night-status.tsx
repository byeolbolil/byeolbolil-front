import type { CSSProperties } from "react"
import type { NightApiError } from "@/lib/tonight/api"

/** 북두칠성의 일곱 별. 자루 끝에서 국자 쪽으로 차례로 잇는다. 좌표는 그림에 맞춰 놓은 것이고 실제 별의 위치는 아니다 */
const DIPPER: readonly (readonly [number, number, number])[] = [
  [66, 62, 2.6],
  [104, 50, 2.8],
  [138, 60, 2.6],
  [172, 76, 2.2],
  [182, 112, 2.6],
  [236, 120, 2.8],
  [246, 78, 3],
]

/** 별 사이를 잇는 선. 마지막 선은 국자를 닫는다 */
const DIPPER_LINES: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 3],
]

/** 뒤에 깔리는 잔별. x, y, 반지름, 깜빡임이 시작하는 시각(초) */
const DUST: readonly (readonly [number, number, number, number])[] = [
  [14, 22, 0.8, 0.2], [38, 96, 0.6, 1.4], [52, 150, 0.9, 0.7], [78, 18, 0.7, 2.1], [92, 128, 0.6, 0.4],
  [118, 30, 0.9, 1.7], [126, 104, 0.6, 0.9], [150, 158, 0.8, 2.4], [160, 22, 0.6, 1.1], [196, 40, 0.9, 0.1],
  [206, 150, 0.7, 1.9], [214, 88, 0.6, 0.6], [262, 30, 0.8, 1.3], [270, 142, 0.9, 2.2], [284, 96, 0.6, 0.3],
  [300, 54, 0.8, 1.6], [306, 168, 0.6, 0.8], [24, 60, 0.6, 2.6], [44, 176, 0.7, 1.2], [232, 172, 0.6, 0.5],
  [178, 182, 0.7, 2.0], [98, 176, 0.6, 1.5], [288, 12, 0.6, 2.3], [8, 132, 0.7, 1.0],
]

/**
 * 추천을 받아 오는 동안의 자리 표시. 캐시가 비어 있으면 첫 요청이 몇 초 걸린다.
 * 기다리는 동안 밤하늘에 북두칠성을 한 별씩 이어 보인다. 움직임을 줄이도록 설정한 기기에서는 다 이어진 그림만 보인다.
 */
export function NightSkeleton() {
  return (
    <div className="skeleton" role="status" aria-live="polite">
      <div className="sky">
        <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g className="sk-dust">
            {DUST.map(([x, y, r, delay]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={r} style={{ animationDelay: `${delay}s` }} />
            ))}
          </g>
          <line className="sk-meteor" x1={292} y1={20} x2={268} y2={34} />
          {DIPPER_LINES.map(([from, to], index) => (
            <line
              key={`${from}-${to}`}
              className="sk-line"
              pathLength={1}
              x1={DIPPER[from][0]}
              y1={DIPPER[from][1]}
              x2={DIPPER[to][0]}
              y2={DIPPER[to][1]}
              style={{ "--i": index } as CSSProperties}
            />
          ))}
          {DIPPER.map(([x, y, r], index) => (
            <circle key={`${x}-${y}`} className="sk-star" cx={x} cy={y} r={r} style={{ "--i": index } as CSSProperties} />
          ))}
        </svg>
        <span>
          오늘 밤 하늘을 살펴보는 중이에요.
          <br />
          처음에는 몇 초 걸릴 수 있어요.
        </span>
      </div>
      <div className="tonight-body" aria-hidden="true">
        <div className="bar" style={{ width: "45%", height: 26 }} />
        <div className="bar" style={{ height: 52 }} />
        <div className="bar" style={{ width: "80%" }} />
      </div>
    </div>
  )
}

function describe(error: NightApiError): string {
  if (error.status === 0) return "인터넷 연결을 확인한 뒤 다시 시도해 주세요."
  if (error.status === 503) return "날씨 예보를 받아 오지 못했어요. 잠시 뒤에 다시 시도해 주세요."
  if (error.status >= 500) return "서버에 문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요."
  return error.message
}

/**
 * 추천을 받지 못했을 때. 이전에 받은 추천을 대신 보여주지 않는다. 지난 예보를 지금 것처럼 보이게 하지 않기 위해서다.
 */
export function NightError({ error, onRetry }: { error: NightApiError; onRetry: () => void }) {
  return (
    <article className="tonight" role="alert">
      <div className="tonight-body">
        <div className="bigtime">추천을 불러오지 못했어요</div>
        <p className="calm">{describe(error)}</p>
        <div className="actions">
          <button type="button" className="btn primary" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      </div>
    </article>
  )
}
