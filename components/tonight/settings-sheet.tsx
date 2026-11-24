"use client"

import { CITIES } from "@/lib/tonight/cities"
import {
  MAX_TRAVEL_OPTIONS,
  MIN_CLEAR_HOURS_RANGE,
  PREFER_BEFORE_OPTIONS,
  type OriginSetting,
  type Settings,
} from "@/lib/tonight/settings"
import type { GeoStatus } from "@/lib/tonight/use-geo-position"
import { Sheet } from "./sheet"

interface SettingsSheetProps {
  settings: Settings
  geoStatus: GeoStatus
  /** 출발 좌표가 정해졌는지. 없으면 이동 시간 한도가 적용되지 않는다 */
  hasOrigin: boolean
  onChange: (patch: Partial<Settings>) => void
  onOpenSources: () => void
  onClose: () => void
}

function originHint(origin: OriginSetting, geoStatus: GeoStatus): string {
  if (origin.kind === "city") return `${origin.name}에서 출발한다고 보고 이동 시간을 어림해요.`
  if (origin.kind === "none") return "출발 위치가 없으면 이동 시간 없이 추천해요."
  switch (geoStatus) {
    case "granted":
      return "지금 있는 곳에서 출발한다고 보고 이동 시간을 어림해요."
    case "denied":
      return "브라우저에서 위치 권한이 꺼져 있어요. 권한을 켜거나 도시를 골라 주세요."
    case "unavailable":
      return "지금은 위치를 알 수 없어요. 도시를 골라 주세요."
    default:
      return "위치를 확인하는 중이에요."
  }
}

/** 설정. 질문에 답하는 방식으로 묻고, 답은 바로 추천에 반영된다. */
export function SettingsSheet({ settings, geoStatus, hasOrigin, onChange, onOpenSources, onClose }: SettingsSheetProps) {
  const { origin } = settings
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
        <div className="hint">{originHint(origin, geoStatus)}</div>
        <div className="seg" role="group" aria-label="어디서 출발하나요?">
          <button type="button" aria-pressed={origin.kind === "gps"} onClick={() => onChange({ origin: { kind: "gps" } })}>
            현재 위치
          </button>
          <select
            className="pick-select"
            aria-label="도시 고르기"
            value={origin.kind === "city" ? origin.name : ""}
            onChange={(event) => {
              if (event.target.value) onChange({ origin: { kind: "city", name: event.target.value } })
            }}
          >
            <option value="">도시 고르기</option>
            {CITIES.map((city) => (
              <option key={city.name} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
          <button type="button" aria-pressed={origin.kind === "none"} onClick={() => onChange({ origin: { kind: "none" } })}>
            정하지 않음
          </button>
        </div>
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
