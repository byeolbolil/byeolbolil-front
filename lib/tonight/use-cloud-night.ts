"use client"

import { useEffect, useState } from "react"
import { fetchCloudNight, type CloudNight } from "./cloud-field"

export interface CloudNightState {
  /** idle: 아직 받지 않는다. loading: 받는 중. ready: 받았다. error: 받지 못했다 */
  status: "idle" | "loading" | "ready" | "error"
  night: CloudNight | null
}

/** 이미 받은 밤. 구름 레이어를 껐다 켜거나 날짜를 오갈 때 다시 받지 않는다. 화면을 새로 열면 비워진다 */
const received = new Map<string, CloudNight>()

const IDLE: CloudNightState = { status: "idle", night: null }

/**
 * 하룻밤의 구름 격자. `enabled`가 false인 동안은 받지 않는다. 구름 레이어를 켰을 때만 필요하기 때문이다.
 * 받지 못해도 지도는 그대로 쓸 수 있어야 하므로 오류를 던지지 않고 상태로 알린다.
 */
export function useCloudNight(date: string | null, enabled: boolean): CloudNightState {
  const [state, setState] = useState<{ date: string } & CloudNightState>({ date: "", ...IDLE })

  useEffect(() => {
    if (!enabled || !date) return
    const known = received.get(date)
    if (known) {
      setState({ date, status: "ready", night: known })
      return
    }
    const controller = new AbortController()
    setState({ date, status: "loading", night: null })
    fetchCloudNight(date, controller.signal)
      .then((night) => {
        received.set(date, night)
        setState({ date, status: "ready", night })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn("[cloud-field] 구름 예보를 받지 못했습니다:", error)
        setState({ date, status: "error", night: null })
      })
    return () => controller.abort()
  }, [date, enabled])

  if (!enabled || !date || state.date !== date) return IDLE
  return { status: state.status, night: state.night }
}
