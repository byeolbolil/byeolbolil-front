import type { NightApiError } from "@/lib/tonight/api"

/** 추천을 받아 오는 동안의 자리 표시. 캐시가 비어 있으면 첫 요청이 몇 초 걸린다. */
export function NightSkeleton() {
  return (
    <div className="skeleton" role="status" aria-live="polite">
      <div className="sky">
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
