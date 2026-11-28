"use client"

import { MAX_TRAVEL_OPTIONS, MIN_CLEAR_HOURS_RANGE, PREFER_BEFORE_OPTIONS, type Settings } from "@/lib/tonight/settings"
import { Sheet } from "./sheet"

interface SettingsSheetProps {
  settings: Settings
  /** 지금 쓰는 출발 위치를 적은 말. 머리의 버튼과 같은 문구다 */
  originText: string
  /** 출발 좌표가 정해졌는지. 없으면 이동 시간 한도가 적용되지 않는다 */
  hasOrigin: boolean
  onChange: (patch: Partial<Settings>) => void
  onOpenOrigin: () => void
  onOpenSources: () => void
  onClose: () => void
}

/**
 * 설정. 질문에 답하는 방식으로 묻고, 답은 바로 추천에 반영된다.
 * 출발 위치는 여기서 정하지 않고 따로 있는 화면(`origin-sheet.tsx`)으로 보낸다.
 */
export function SettingsSheet({
  settings,
  originText,
  hasOrigin,
  onChange,
  onOpenOrigin,
  onOpenSources,
  onClose,
}: SettingsSheetProps) {
  return (
    <Sheet title="나에게 맞추기" onClose={onClose}>
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
          출발 위치에서 차로 걸리는 시간이에요.{hasOrigin ? "" : " 출발 위치를 정해야 적용돼요."}{" "}
          <button type="button" className="linkish" onClick={onOpenOrigin}>
            {hasOrigin ? `${originText} · 바꾸기` : "출발 위치 정하기"}
          </button>
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

      <details className="adv">
        <summary>고급 기준</summary>
        <div className="ctrl">
          <label htmlFor="min-clear-hours">
            &quot;별 보기 아주 좋아요&quot;에 필요한 맑은 시간 <output>{settings.minClearHours}시간</output>
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
      <a className="linkish" style={{ alignSelf: "flex-start" }} href="/terms">
        이용약관
      </a>
      <a className="linkish" style={{ alignSelf: "flex-start" }} href="/privacy">
        개인정보처리방침
      </a>
    </Sheet>
  )
}
