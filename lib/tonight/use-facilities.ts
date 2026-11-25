"use client"

import { useEffect, useState } from "react"
import { fetchFacilities, type Facility } from "./spots"

export interface FacilitiesState {
  /** idle: 아직 받지 않는다. loading: 받는 중. ready: 받았다. error: 받지 못했다 */
  status: "idle" | "loading" | "ready" | "error"
  facilities: readonly Facility[]
}

/** 한 번 받은 목록. 화면을 오가도 다시 받지 않는다. 새로 열면 비워진다 */
let received: readonly Facility[] | null = null

const IDLE: FacilitiesState = { status: "idle", facilities: [] }

/**
 * 천문대와 과학관 목록. `enabled`가 false인 동안은 받지 않는다. 목록을 펼쳤을 때만 필요하기 때문이다.
 * 받지 못해도 추천 화면은 그대로 쓸 수 있어야 하므로 오류를 던지지 않고 상태로 알린다.
 */
export function useFacilities(enabled: boolean): FacilitiesState {
  const [state, setState] = useState<FacilitiesState>(IDLE)

  useEffect(() => {
    if (!enabled) return
    if (received) {
      setState({ status: "ready", facilities: received })
      return
    }
    const controller = new AbortController()
    setState({ status: "loading", facilities: [] })
    fetchFacilities(controller.signal)
      .then((facilities) => {
        received = facilities
        setState({ status: "ready", facilities })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn("[spots] 천문대 목록을 받지 못했습니다:", error)
        setState({ status: "error", facilities: [] })
      })
    return () => controller.abort()
  }, [enabled])

  return enabled ? state : IDLE
}
