"use client"

import { useCallback, useEffect, useState } from "react"
import { authStore } from "@/lib/store/authStore"
import type { Coordinates } from "./settings"
import type { NightQuery } from "./types"
import { fetchMyWeek, fetchWeek, myWeekUrl, weekUrl, type WeekOutlook } from "./week"

export interface WeekState {
  /** idle: 아직 받지 않는다. loading: 받는 중. ready: 받았다. error: 받지 못했다 */
  status: "idle" | "loading" | "ready" | "error"
  week: WeekOutlook | null
  reload: () => void
}

type Criteria = Pick<NightQuery, "minClearHours" | "preferBefore">

/**
 * 좌표 하나의 이번 주. 위치가 없는 동안은 받지 않는다.
 * 같은 주소로 받아 둔 결과가 있으면 화면을 오가는 동안 다시 받지 않는다. 예보가 바뀌는 간격(6시간)보다 훨씬 짧은
 * 10분만 들고 있는다.
 */
const KEEP_MS = 10 * 60 * 1000
const kept = new Map<string, { at: number; week: WeekOutlook }>()

export function useWeek(position: Coordinates | null, criteria: Criteria): WeekState {
  const lat = position?.lat ?? null
  const lon = position?.lon ?? null
  const { minClearHours, preferBefore } = criteria
  const url = lat !== null && lon !== null ? weekUrl({ lat, lon }, { minClearHours, preferBefore }) : null
  const [state, setState] = useState<{ url: string | null; status: WeekState["status"]; week: WeekOutlook | null }>({
    url: null,
    status: "idle",
    week: null,
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (url === null || lat === null || lon === null) return
    const cached = kept.get(url)
    if (cached && Date.now() - cached.at < KEEP_MS && attempt === 0) {
      setState({ url, status: "ready", week: cached.week })
      return
    }
    const controller = new AbortController()
    setState({ url, status: "loading", week: null })
    fetchWeek({ lat, lon }, { minClearHours, preferBefore }, controller.signal)
      .then((week) => {
        kept.set(url, { at: Date.now(), week })
        setState({ url, status: "ready", week })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn("[week] 이번 주 예보를 받지 못했습니다:", error)
        setState({ url, status: "error", week: null })
      })
    return () => controller.abort()
  }, [url, lat, lon, minClearHours, preferBefore, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  if (url === null) return { status: "idle", week: null, reload }
  // 위치가 바뀐 직후에는 이전 위치의 결과가 남아 있다. 새 요청이 시작될 때까지 받는 중으로 본다
  if (state.url !== url) return { status: "loading", week: null, reload }
  return { status: state.status, week: state.week, reload }
}

/**
 * 저장한 장소들의 이번 주. 로그인했을 때만 받는다. `revision`이 바뀌면(장소를 더하거나 지웠을 때) 다시 받는다.
 * 다시 받는 동안에는 이전 결과를 그대로 보여 준다.
 */
export function useMyWeek(enabled: boolean, criteria: Criteria, revision: number): WeekState {
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const { minClearHours, preferBefore } = criteria
  const url = myWeekUrl({ minClearHours, preferBefore })
  const active = enabled && isAuthenticated
  const [state, setState] = useState<{ status: WeekState["status"]; week: WeekOutlook | null }>({ status: "idle", week: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    setState((previous) => ({ status: "loading", week: previous.week }))
    fetchMyWeek({ minClearHours, preferBefore }, controller.signal)
      .then((week) => setState({ status: "ready", week }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn("[week] 내 장소의 이번 주를 받지 못했습니다:", error)
        setState({ status: "error", week: null })
      })
    return () => controller.abort()
  }, [active, url, minClearHours, preferBefore, revision, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  if (!active) return { status: "idle", week: null, reload }
  return { ...state, reload }
}
