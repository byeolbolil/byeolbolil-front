"use client"

import { useState } from "react"
import { CITIES } from "@/lib/tonight/cities"
import type { FoundPlace } from "@/lib/tonight/geocode"
import {
  MAX_TRAVEL_OPTIONS,
  MIN_CLEAR_HOURS_RANGE,
  ORIGIN_NAME_MAX,
  PREFER_BEFORE_OPTIONS,
  type OriginSetting,
  type Settings,
} from "@/lib/tonight/settings"
import type { GeoStatus } from "@/lib/tonight/use-geo-position"
import { PlaceSearch } from "./place-search"
import { Sheet } from "./sheet"

/** 검색하지 않고 바로 고를 수 있게 내놓는 도시 */
const QUICK_CITIES = ["서울", "부산", "인천", "대구", "대전", "광주", "울산", "강릉", "제주"]
  .map((name) => CITIES.find((city) => city.name === name))
  .filter((city) => city !== undefined)

interface SettingsSheetProps {
  settings: Settings
  geoStatus: GeoStatus
  /** 현재 위치가 속한 지역의 이름. 아직 모르면 null */
  gpsArea: string | null
  /** 출발 좌표가 정해졌는지. 없으면 이동 시간 한도가 적용되지 않는다 */
  hasOrigin: boolean
  onChange: (patch: Partial<Settings>) => void
  onOpenSources: () => void
  onClose: () => void
}

function originHint(origin: OriginSetting, geoStatus: GeoStatus, gpsArea: string | null): string {
  if (origin.kind === "place") return `${origin.name}에서 출발한다고 보고 이동 시간을 어림해요.`
  if (origin.kind === "none") return "출발 위치가 없으면 이동 시간 없이 추천해요."
  switch (geoStatus) {
    case "granted":
      return `이 기기가 지금 있는 곳${gpsArea ? `(${gpsArea} 근처)` : ""}에서 출발한다고 보고 이동 시간을 어림해요.`
    case "denied":
      return "브라우저에서 위치 권한이 꺼져 있어요. 권한을 켜거나 출발 위치를 직접 정해 주세요."
    case "unavailable":
      return "지금은 위치를 알 수 없어요. 출발 위치를 직접 정해 주세요."
    case "asking":
      return "브라우저가 위치를 써도 되는지 묻고 있어요. 허용하면 지금 있는 곳을 출발 위치로 써요."
    default:
      return "위치를 확인하는 중이에요."
  }
}

/** 설정. 질문에 답하는 방식으로 묻고, 답은 바로 추천에 반영된다. */
export function SettingsSheet({
  settings,
  geoStatus,
  gpsArea,
  hasOrigin,
  onChange,
  onOpenSources,
  onClose,
}: SettingsSheetProps) {
  const { origin } = settings
  /** "직접 정하기"를 눌러 고르는 중인지. 고르기 전까지는 앞서 정한 출발 위치를 그대로 쓴다 */
  const [choosing, setChoosing] = useState(false)
  const originMode = choosing ? "place" : origin.kind
  const chooseOrigin = (place: Pick<FoundPlace, "name" | "lat" | "lon">) => {
    onChange({ origin: { kind: "place", name: place.name.slice(0, ORIGIN_NAME_MAX), lat: place.lat, lon: place.lon } })
    setChoosing(false)
  }
  return (
    <Sheet title="나에게 맞추기" onClose={onClose}>
      <div className="q">
        <div className="ql">보기 방식</div>
        <div className="hint">자세히를 고르면 점수, 구름량, 광해 등급 같은 숫자를 함께 보여줘요.</div>
        <div className="seg" role="group" aria-label="보기 방식">
          <button type="button" aria-pressed={settings.viewMode === "simple"} onClick={() => onChange({ viewMode: "simple" })}>
            간단히
          </button>
          <button type="button" aria-pressed={settings.viewMode === "detailed"} onClick={() => onChange({ viewMode: "detailed" })}>
            자세히
          </button>
        </div>
      </div>

      <div className="q">
        <div className="ql">몇 시까지 볼 수 있나요?</div>
        <div className="hint">이 시간 전에 맑은 곳을 더 높게 추천해요.</div>
        <div className="seg" role="group" aria-label="몇 시까지 볼 수 있나요?">
          {PREFER_BEFORE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={settings.preferBefore === option.value}
              onClick={() => onChange({ preferBefore: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="q">
        <div className="ql">얼마나 멀리 갈 수 있나요?</div>
        <div className="hint">
          출발 위치에서 차로 걸리는 시간이에요.{hasOrigin ? "" : " 출발 위치를 정해야 적용돼요."}
        </div>
        <div className="seg" role="group" aria-label="얼마나 멀리 갈 수 있나요?">
          {MAX_TRAVEL_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={settings.maxTravelMinutes === option.value}
              onClick={() => onChange({ maxTravelMinutes: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="q">
        <div className="ql">어디서 출발하나요?</div>
        <div className="hint">{originHint(origin, geoStatus, gpsArea)}</div>
        <div className="seg" role="group" aria-label="어디서 출발하나요?">
          <button
            type="button"
            aria-pressed={originMode === "gps"}
            onClick={() => {
              setChoosing(false)
              onChange({ origin: { kind: "gps" } })
            }}
          >
            내 위치
          </button>
          <button type="button" aria-pressed={originMode === "place"} onClick={() => setChoosing(true)}>
            직접 정하기
          </button>
          <button
            type="button"
            aria-pressed={originMode === "none"}
            onClick={() => {
              setChoosing(false)
              onChange({ origin: { kind: "none" } })
            }}
          >
            정하지 않음
          </button>
        </div>
        {originMode === "place" ? (
          <div className="origin-pick">
            <PlaceSearch
              label="출발 위치 검색"
              placeholder="동네, 도시, 역 이름으로 찾기"
              emptyHint="다른 이름으로 찾아 보세요."
              onSelect={chooseOrigin}
            />
            <div className="chips" role="group" aria-label="도시에서 고르기">
              {QUICK_CITIES.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  aria-pressed={origin.kind === "place" && origin.name === city.name}
                  onClick={() => chooseOrigin(city)}
                >
                  {city.name}
                </button>
              ))}
            </div>
            <div className="hint">지도에서 빈 곳을 누른 뒤 &quot;여기서 출발&quot;을 골라도 돼요.</div>
          </div>
        ) : null}
      </div>

      <details className="adv">
        <summary>고급 기준</summary>
        <div className="ctrl">
          <label htmlFor="min-clear-hours">
            &quot;꼭 가볼 만해요&quot;에 필요한 맑은 시간 <output>{settings.minClearHours}시간</output>
          </label>
          <input
            id="min-clear-hours"
            type="range"
            min={MIN_CLEAR_HOURS_RANGE.min}
            max={MIN_CLEAR_HOURS_RANGE.max}
            step={1}
            value={settings.minClearHours}
            onChange={(event) => onChange({ minClearHours: Number(event.target.value) })}
          />
        </div>
        <div className="q">
          <div className="ql">적색 화면</div>
          <div className="hint">현장에서 어둠에 익은 눈을 지켜줘요.</div>
          <div className="seg" role="group" aria-label="적색 화면">
            <button type="button" aria-pressed={!settings.redScreen} onClick={() => onChange({ redScreen: false })}>
              끄기
            </button>
            <button type="button" aria-pressed={settings.redScreen} onClick={() => onChange({ redScreen: true })}>
              켜기
            </button>
          </div>
        </div>
      </details>

      <button type="button" className="linkish" style={{ alignSelf: "flex-start" }} onClick={onOpenSources}>
        추천 기준과 출처 보기
      </button>
    </Sheet>
  )
}
