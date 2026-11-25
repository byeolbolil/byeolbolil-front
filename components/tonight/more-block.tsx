import { average, windowHours } from "@/lib/tonight/hours"
import { travelText } from "@/lib/tonight/place"
import { CLEAR_CLOUD_COVER_MAX, MILKY_WAY_LOST_SKY, TRAVEL_PENALTY_PER_HOUR } from "@/lib/tonight/policy"
import { skyBrightnessText, skyHint, skyName } from "@/lib/tonight/sky"
import { PREFER_ALL_NIGHT } from "@/lib/tonight/settings"
import { koreanClock } from "@/lib/tonight/time"
import type { NightCriteria, NightPlace } from "@/lib/tonight/types"
import { cloudHeadline } from "@/lib/tonight/wording"
import { moonPhaseName, moonTimesText } from "@/lib/tonight/moon"
import { CloudSky, DarknessScale, HumidityDrop, MoonGlow, MoonPhase, ScoreRing } from "./gauges"
import { HourStrip } from "./hour-strip"
import { CarIcon, CityIcon, ClockIcon, MoonIcon, SkyIcon } from "./icons"

interface MoreBlockProps {
  place: NightPlace
  nightDate: string
  /** 서버가 이 추천에 적용한 기준 */
  criteria: NightCriteria
  onOpenSources: () => void
}

/**
 * 자세히 보기. 점수, 구름, 달, 습도, 하늘 어두움을 그림으로 먼저 보여주고 숫자는 옆에 작게 붙인다.
 * 그 아래에 시간별 하늘과, 등급을 정하는 기준 가운데 이 장소에 해당하는 것을 표시한다.
 * 예보 출처는 여기 두지 않는다. 화면 맨 아래의 출처 표기가 맡는다.
 */
export function MoreBlock({ place, nightDate, criteria, onOpenSources }: MoreBlockProps) {
  const inWindow = windowHours(place.hours, place.bestWindow)
  // 추천 시간이 없는 밤은 어두운 시간 전체로 본다
  const basis = inWindow.length > 0 ? inWindow : place.hours.filter((hour) => hour.dark)
  const span = place.bestWindow ? "추천 시간" : "어두운 시간"
  const score = average(basis, (hour) => hour.score)
  const cloud = average(basis, (hour) => hour.cloudCover)
  const humidity = average(basis, (hour) => hour.relativeHumidity)
  const moonHours = basis.filter((hour) => hour.moonUp).length
  const moonPercent = Math.round(place.moonBrightness * 100)
  const moonTimes = moonTimesText(place.moon)
  const before = criteria.preferBefore === PREFER_ALL_NIGHT ? "밤사이" : `${koreanClock(criteria.preferBefore)} 전에`
  const travel = travelText(place.travel)
  // 서버는 등급을 실제로 낮췄을 때만 CITY_LIGHTS를 붙인다. 이미 낮은 등급인 밤에도 해당되는 곳임을 알리려고 하늘 밝기도 본다
  const cityLights =
    place.notes.includes("CITY_LIGHTS") || (place.skyBrightness !== undefined && place.skyBrightness >= MILKY_WAY_LOST_SKY)
  const lightsInView = place.notes.includes("LIGHTS_IN_VIEW")

  return (
    <div className="more">
      <ul className="glance">
        <li className="wide">
          <ScoreRing score={score} />
          <div>
            <b>관측 점수 {score === null ? "없음" : `${score}점`}</b>
            <span>
              구름, 하늘 밝기, 달빛을 반영한 시간별 점수를 {span} 동안 평균한 값이에요. 100점이 가장 좋아요
            </span>
          </div>
        </li>
        <li>
          <CloudSky cloudCover={cloud} />
          <div>
            <b>{place.bestWindow ? cloudHeadline(cloud) : "구름이 두꺼워요"}</b>
            <span>{cloud === null ? "구름 예보가 없어요" : `하늘의 ${cloud}%를 구름이 가려요`}</span>
          </div>
        </li>
        <li>
          {place.moon ? (
            <MoonPhase moon={place.moon} brightness={place.moonBrightness} up={moonHours > 0} />
          ) : (
            <MoonGlow brightness={place.moonBrightness} up={moonHours > 0} />
          )}
          <div>
            <b>{place.moon ? moonPhaseName(place.moon) : moonHours > 0 ? "달이 떠 있어요" : "달 없는 하늘"}</b>
            <span>
              {moonHours > 0
                ? `보름일 때의 ${moonPercent}% 밝기예요. ${span} 중 ${moonHours}시간 떠 있어요`
                : `${span}에는 달이 떠 있지 않아요`}
            </span>
            {moonTimes ? <span>{moonTimes}</span> : null}
          </div>
        </li>
        <li>
          <HumidityDrop humidity={humidity} />
          <div>
            <b>{place.notes.includes("DEW") ? "이슬 주의" : "이슬 걱정 적어요"}</b>
            <span>{humidity === null ? "습도 예보가 없어요" : `습도 ${humidity}%`}</span>
          </div>
        </li>
        <li className="stack">
          <div>
            <b>{skyName(place.skyClass)}</b>
            <span>
              {skyBrightnessText(place.skyBrightness)}
              {place.skyClass ? `. ${skyHint(place.skyClass)}` : ""}
            </span>
            {lightsInView ? <span>아래쪽 마을이나 도시의 불빛이 산에 가리지 않고 직접 보여요</span> : null}
          </div>
          <DarknessScale skyBrightness={place.skyBrightness} skyClass={place.skyClass} />
        </li>
      </ul>

      <h3>시간별 하늘</h3>
      <HourStrip place={place} nightDate={nightDate} preferBefore={criteria.preferBefore} />
      <p className="hstrip-key">
        <span className="k-best">추천 시간</span>
        <span className="k-bar">막대는 관측 점수</span>
        {place.hours.some((hour) => hour.moonUp) ? <span className="k-moon">달이 떠 있는 시간</span> : null}
        {criteria.preferBefore === PREFER_ALL_NIGHT ? null : (
          <span className="k-cut">세로 선은 {koreanClock(criteria.preferBefore)}</span>
        )}
      </p>

      <h3>등급은 이렇게 정해요</h3>
      <ul className="rules">
        <li>
          <ClockIcon />
          <div>
            구름이 <b>{CLEAR_CLOUD_COVER_MAX}% 이하</b>인 어두운 시간이{" "}
            <b>
              {before} {criteria.minClearHours}시간 이상
            </b>{" "}
            이어지면 &quot;별 보기 아주 좋아요&quot;예요
            <em>{place.bestWindow ? `이곳은 ${place.bestWindow.hours}시간 이어져요` : "이곳은 맑은 시간이 없어요"}</em>
          </div>
        </li>
        <li>
          <MoonIcon />
          <div>
            달이 밝게 떠 있으면 한 단계 내려요
            {place.notes.includes("BRIGHT_MOON") ? <em>이곳에 해당돼요</em> : null}
          </div>
        </li>
        <li>
          <CityIcon />
          <div>
            은하수가 보이지 않는 하늘(인공 불빛이 자연의 {MILKY_WAY_LOST_SKY}배 이상)이나 불빛에 둘러싸인 곳은 &quot;별 보기
            아쉬워요&quot;까지만 줘요
            {cityLights ? <em>이곳에 해당돼요</em> : null}
          </div>
        </li>
        <li>
          <SkyIcon />
          <div>
            하늘이 어두울수록, 아래쪽 불빛이 산에 가려질수록 같은 등급 안에서 앞에 와요
            {lightsInView ? <em>이곳은 불빛이 직접 보여요</em> : null}
          </div>
        </li>
        <li>
          <CarIcon />
          <div>
            순위는 이동 1시간마다 <b>{TRAVEL_PENALTY_PER_HOUR}점</b>을 빼서 정해요
            {travel ? <em>이곳은 {travel}</em> : null}
          </div>
        </li>
      </ul>
      <button type="button" className="linkish" style={{ alignSelf: "flex-start" }} onClick={onOpenSources}>
        기준과 출처 보기
      </button>
    </div>
  )
}
