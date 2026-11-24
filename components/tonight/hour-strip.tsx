import { preferBeforeIndex, windowIndexRange } from "@/lib/tonight/hours"
import { hourOf } from "@/lib/tonight/time"
import type { NightHour, NightPlace } from "@/lib/tonight/types"
import { NEARLY_CLEAR_CLOUD_COVER } from "@/lib/tonight/wording"
import { STAR_PATH } from "./icons"

type HourSky = "clear" | "partly" | "cloudy" | "light"

/** 한 시간의 하늘을 그림 하나로. 맑은지는 서버가 준 `clear`를 그대로 쓴다 */
function skyOf(hour: NightHour): HourSky {
  if (!hour.dark) return "light"
  if (!hour.clear) return "cloudy"
  return hour.cloudCover < NEARLY_CLEAR_CLOUD_COVER ? "clear" : "partly"
}

const SKY_LABEL: Record<HourSky, string> = {
  clear: "맑음",
  partly: "구름 조금",
  cloudy: "구름 많음",
  light: "아직 밝음",
}

const CLOUD_PATH = "M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 7 10.5 3.75 3.75 0 0 0 7 18Z"

function SkyGlyph({ sky }: { sky: HourSky }) {
  if (sky === "clear") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={STAR_PATH} fill="var(--star)" transform="translate(12 12) scale(0.8) translate(-12 -12)" />
      </svg>
    )
  }
  if (sky === "partly") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={STAR_PATH} fill="var(--star)" transform="translate(15.5 8) scale(0.5) translate(-12 -12)" />
        <path d={CLOUD_PATH} fill="var(--cloud)" transform="translate(-1.5 3.5) scale(0.82)" />
      </svg>
    )
  }
  if (sky === "cloudy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={CLOUD_PATH} fill="var(--cloud)" />
      </svg>
    )
  }
  // 해가 지평선에 걸린 모양
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
      <path d="M7 16a5 5 0 0 1 10 0M3 16h18M12 6v2M5.6 9.6l1.4 1.4M18.4 9.6 17 11" />
    </svg>
  )
}

function MoonGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="oklch(0.95 0.04 95)" />
    </svg>
  )
}

interface HourStripProps {
  place: NightPlace
  /** 밤이 시작하는 날짜 */
  nightDate: string
  /** 선호 시각(HH:mm). 그 시각의 칸 앞에 선을 긋는다 */
  preferBefore: string
}

/**
 * 시간별 하늘. 한 시간이 한 칸이고, 위에서부터 시각, 하늘 그림, 구름량, 달, 점수 막대다.
 * 추천 시간대의 칸은 바탕을 밝히고, 선호 시각에는 세로 선을 긋는다.
 */
export function HourStrip({ place, nightDate, preferBefore }: HourStripProps) {
  const { hours } = place
  if (hours.length === 0) return null
  const best = windowIndexRange(hours, place.bestWindow)
  const cut = preferBeforeIndex(hours, nightDate, preferBefore)
  const anyMoon = hours.some((hour) => hour.moonUp)

  return (
    <div className="hstrip-wrap">
      <ol className="hstrip" aria-label="시간별 하늘">
        {hours.map((hour, index) => {
          const sky = skyOf(hour)
          const inBest = best !== null && index >= best[0] && index <= best[1]
          const classes = [inBest ? "best" : "", cut === index ? "cut" : ""].filter(Boolean).join(" ")
          return (
            <li key={hour.time} className={classes || undefined}>
              <span className="t">{hourOf(hour.time)}시</span>
              <span className="g" title={SKY_LABEL[sky]}>
                <SkyGlyph sky={sky} />
              </span>
              <span className="c">
                <span className="sr">{SKY_LABEL[sky]}, 구름 </span>
                {hour.cloudCover}%
              </span>
              {anyMoon ? (
                <span className="m">
                  {hour.moonUp ? (
                    <>
                      <MoonGlyph />
                      <span className="sr">달 떠 있음</span>
                    </>
                  ) : null}
                </span>
              ) : null}
              <span className="bar" aria-hidden="true">
                <i style={{ height: `${Math.max(hour.score > 0 ? 6 : 0, hour.score)}%` }} />
              </span>
              <span className="s">
                <span className="sr">점수 </span>
                {hour.dark ? hour.score : "–"}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
