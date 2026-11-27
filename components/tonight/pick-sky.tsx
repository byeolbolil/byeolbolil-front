"use client"

import { skyBrightnessText, skyHint, skyName, skyRankText } from "@/lib/tonight/sky"
import type { SkyAt } from "@/lib/tonight/api"
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

/**
 * 지도에서 누른 장소의 하늘 밝기. 추천 응답에 든 값으로 바로 그리고, 둘레 불빛 여부는 빈 곳을 눌렀을 때와 같은
 * 요청으로 받아 채운다. 그래서 같은 자리면 표식을 눌렀을 때와 빈 곳을 눌렀을 때 같은 내용이 나온다.
 */
export function placeSkyState(
  place: { skyBrightness?: number; skyClass?: SkyAt["skyClass"]; skyRank?: number },
  fetched: SkyAtState | null,
): SkyAtState | null {
  if (fetched?.status === "ready" || place.skyBrightness === undefined) return fetched
  return {
    status: "ready",
    sky: { skyBrightness: place.skyBrightness, skyClass: place.skyClass, skyRank: place.skyRank },
  }
}
