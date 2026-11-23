"use client"

import { useEffect, useState } from "react"
import type { Coordinates } from "./settings"

export type GeoStatus =
  /** 현재 위치를 쓰지 않는다 */
  | "idle"
  /** 권한 상태를 확인하는 중이다. 곧 끝나므로 추천 요청을 잠깐 미룬다 */
  | "checking"
  /** 권한이 이미 있어서 곧 위치가 온다. 이 동안은 추천 요청을 잠깐 미룬다 */
  | "locating"
  /** 권한을 묻는 중이다. 답을 기다리지 않고 출발지 없이 먼저 보여준다 */
  | "asking"
  | "granted"
  | "denied"
  | "unavailable"

export interface GeoPosition {
  status: GeoStatus
  position: Coordinates | null
}

/** 권한이 있는데도 위치가 오지 않을 때 기다리는 한도. 넘기면 출발지 없이 진행한다. */
const LOCATE_TIMEOUT_MS = 6000

async function permissionState(): Promise<PermissionState | "unknown"> {
  try {
    if (!navigator.permissions) return "unknown"
    const status = await navigator.permissions.query({ name: "geolocation" })
    return status.state
  } catch {
    return "unknown"
  }
}

/**
 * 브라우저의 현재 위치. `enabled`가 false면 묻지 않는다.
 * 거부하거나 실패해도 오류로 다루지 않는다. 출발지 없이도 추천은 받을 수 있다.
 */
export function useGeoPosition(enabled: boolean): GeoPosition {
  const [state, setState] = useState<GeoPosition>({ status: "idle", position: null })

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle", position: null })
      return
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable", position: null })
      return
    }
    let cancelled = false

    permissionState().then((permission) => {
      if (cancelled) return
      if (permission === "denied") {
        setState({ status: "denied", position: null })
        return
      }
      setState({ status: permission === "granted" ? "locating" : "asking", position: null })
      navigator.geolocation.getCurrentPosition(
        (result) => {
          if (cancelled) return
          setState({
            status: "granted",
            position: { lat: result.coords.latitude, lon: result.coords.longitude },
          })
        },
        (error) => {
          if (cancelled) return
          setState({ status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable", position: null })
        },
        { enableHighAccuracy: false, timeout: LOCATE_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 },
      )
    })

    return () => {
      cancelled = true
    }
  }, [enabled])

  // 켜진 직후에는 아직 effect가 돌지 않아 idle로 남아 있다. 그 사이에 출발지 없는 요청이 나가지 않게 한다.
  if (enabled && state.status === "idle") return { status: "checking", position: null }
  return state
}
