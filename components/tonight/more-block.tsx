import { average, windowHours } from "@/lib/tonight/hours"
import { CITY_BORTLE_MIN, CLEAR_CLOUD_COVER_MAX, TRAVEL_PENALTY_PER_HOUR } from "@/lib/tonight/policy"
import { PREFER_ALL_NIGHT } from "@/lib/tonight/settings"
import { issuedAtText, koreanClock } from "@/lib/tonight/time"
import type { NightCriteria, NightPlace } from "@/lib/tonight/types"
import { bortleName, forecastSourceName } from "@/lib/tonight/wording"
import { HourChart } from "./hour-chart"

interface MoreBlockProps {
  place: NightPlace
  nightDate: string
  /** 서버가 이 추천에 적용한 기준 */
  criteria: NightCriteria
  onOpenSources: () => void
}

/** 자세히 보기. 추천 시간의 점수와 구름, 광해 등급, 달, 습도, 예보 출처를 숫자로 보여주고 시간대별 그래프를 붙인다. */
export function MoreBlock({ place, nightDate, criteria, onOpenSources }: MoreBlockProps) {
  const inWindow = windowHours(place.hours, place.bestWindow)
  const score = average(inWindow, (hour) => hour.score)
  const cloud = average(inWindow, (hour) => hour.cloudCover)
  const humidity = average(inWindow.length > 0 ? inWindow : place.hours.filter((hour) => hour.dark), (hour) => hour.relativeHumidity)
  const moonHours = (inWindow.length > 0 ? inWindow : place.hours.filter((hour) => hour.dark)).filter((hour) => hour.moonUp).length
  const span = place.bestWindow ? "추천 시간 평균" : "어두운 시간 평균"
  const before = criteria.preferBefore === PREFER_ALL_NIGHT ? "밤사이" : `${koreanClock(criteria.preferBefore)} 전에`

  return (
    <div className="more">
      <div className="facts">
        <div className="fact">
          <div className="k">관측 점수 (추천 시간 평균)</div>
          <div className="v">{score === null ? "–" : `${score}/100`}</div>
          <div className="s">시간별 점수를 평균한 값</div>
        </div>
        <div className="fact">
          <div className="k">구름 (추천 시간 평균)</div>
          <div className="v">{cloud === null ? "–" : `${cloud}%`}</div>
          <div className="s">1시간 단위 예보</div>
        </div>
        <div className="fact">
          <div className="k">광해 등급 (Bortle)</div>
          <div className="v">{place.bortleClass}등급</div>
          <div className="s">{bortleName(place.bortleClass)}</div>
        </div>
        <div className="fact">
          <div className="k">달 (보름 대비 밝기)</div>
          <div className="v">{Math.round(place.moonBrightness * 100)}%</div>
          <div className="s">
            {place.bestWindow ? "추천 시간" : "어두운 시간"} 중 {moonHours}시간 떠 있음
          </div>
        </div>
        <div className="fact">
          <div className="k">습도 ({span})</div>
          <div className="v">{humidity === null ? "–" : `${humidity}%`}</div>
          <div className="s">{place.notes.includes("DEW") ? "렌즈에 이슬이 맺힐 수 있어요" : "이슬 걱정 적어요"}</div>
        </div>
        <div className="fact">
          <div className="k">예보 출처</div>
          <div className="v">{forecastSourceName(place.forecastSource)}</div>
          <div className="s">{place.forecastIssuedAt ? `${issuedAtText(place.forecastIssuedAt)} 생성` : "생성 시각 모름"}</div>
        </div>
      </div>
      <h3>시간대별 구름량(%)과 관측 점수</h3>
      <HourChart place={place} nightDate={nightDate} preferBefore={criteria.preferBefore} />
      <p className="rule">
        구름이 <b>{CLEAR_CLOUD_COVER_MAX}% 이하</b>인 어두운 시간이{" "}
        <b>
          {before} {criteria.minClearHours}시간 이상
        </b>{" "}
        이어지면 <b>꼭 가볼 만해요</b>. 달이 밝게 떠 있으면 한 단계 내리고, 도시 하늘({CITY_BORTLE_MIN}등급 이상)은 &quot;잠깐
        볼 수 있어요&quot;까지만 줘요. 순위는 이동 1시간마다 <b>{TRAVEL_PENALTY_PER_HOUR}점</b>을 빼서 정해요.
        <br />
        <button type="button" className="linkish" onClick={onOpenSources}>
          기준과 출처 보기
        </button>
      </p>
    </div>
  )
}
