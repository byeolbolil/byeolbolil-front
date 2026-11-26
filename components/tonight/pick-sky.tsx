"use client"

import { skyBrightnessText, skyHint, skyName, skyRankText } from "@/lib/tonight/sky"
import type { SkyAtState } from "@/lib/tonight/use-sky-at"
import { DarknessScale } from "./gauges"

/**
 * 지도에서 고른 자리의 하늘이 얼마나 어두운지. 등급 이름과 배수, 장소 카드와 같은 다섯 칸 눈금으로 보여 준다.
 * 불러오지 못하면 자리를 비운다. 하늘 밝기 없이도 카드는 쓸 수 있다.
 */
export function PickSky({ state }: { state: SkyAtState | null }) {
  if (!state || state.status === "error") return null
  if (state.status === "loading") return <div className="pick-sky muted">하늘 밝기를 찾는 중이에요</div>

  const { skyBrightness, skyClass, skyRank, litSurroundings } = state.sky
  if (skyBrightness === undefined) return <div className="pick-sky muted">이곳은 하늘 밝기 자료가 없어요</div>
  return (
    <div className="pick-sky">
      <div className="pick-sky-head">
        <b>{skyName(skyClass)}</b>
        {skyRank ? <span className="rank">{skyRankText(skyRank)}</span> : null}
      </div>
      <DarknessScale skyBrightness={skyBrightness} skyClass={skyClass} />
      <p>
        {skyClass ? `${skyHint(skyClass)}. ` : ""}
        {skyBrightnessText(skyBrightness)}
      </p>
      {litSurroundings ? <p className="warn">둘레에 가로등이나 건물 불빛이 많은 곳이에요</p> : null}
    </div>
  )
}
