"use client"

import { useEffect, useState } from "react"
import { fetchSky, type SkyAt } from "./api"
import type { Coordinates } from "./settings"

/** 이미 물어본 좌표의 답. 하늘 밝기는 바뀌지 않는 값이라 화면을 오가며 다시 묻지 않는다 */
const known = new Map<string, SkyAt>()

const keyOf = (position: Coordinates) => `${position.lat.toFixed(4)},${position.lon.toFixed(4)}`

export type SkyAtState = { status: "loading" } | { status: "ready"; sky: SkyAt } | { status: "error" }

/** 지도에서 고른 자리의 하늘 밝기. 고른 자리가 없으면 null이다 */
export function useSkyAt(position: Coordinates | null): SkyAtState | null {
  const key = position ? keyOf(position) : null
  const lat = position?.lat ?? null
  const lon = position?.lon ?? null
  const [resolved, setResolved] = useState<{ key: string; state: SkyAtState } | null>(null)

  useEffect(() => {
    if (key === null || lat === null || lon === null) return
    const cached = known.get(key)
    if (cached) {
      setResolved({ key, state: { status: "ready", sky: cached } })
      return
    }
    const controller = new AbortController()
    fetchSky({ lat, lon }, controller.signal)
      .then((sky) => {
        known.set(key, sky)
        setResolved({ key, state: { status: "ready", sky } })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setResolved({ key, state: { status: "error" } })
      })
    return () => controller.abort()
  }, [key, lat, lon])

  if (key === null) return null
  return resolved && resolved.key === key ? resolved.state : { status: "loading" }
}
