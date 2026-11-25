"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { authApi } from "@/lib/api/auth"
import { authStore } from "@/lib/store/authStore"
import { fetchNight, fetchNightSummary, NightApiError, nightSummaryUrl, nightUrl } from "./api"
import type { NightQuery, NightRecommendation, NightSummary } from "./types"

export interface NightState {
  /** 마지막으로 받은 추천. 다시 받는 동안에도 남겨 둔다 */
  data: NightRecommendation | null
  /** `data`가 지금 조건이 아니라 이전 조건으로 받은 결과인지 */
  stale: boolean
  loading: boolean
  error: NightApiError | null
  reload: () => void
}

/**
 * 토큰을 붙여 받고, 토큰이 만료됐으면 한 번 재발급해서 다시 받는다. 재발급도 실패하면 로그인하지 않은 것으로 보고
 * 기본 추천 명소만 받는다.
 */
export function fetchNightWithAuth(
  date: string | null,
  query: NightQuery,
  signal?: AbortSignal,
): Promise<NightRecommendation> {
  return withAuth((accessToken) => fetchNight(date, query, { accessToken, signal }))
}

async function withAuth<T>(call: (accessToken: string | null) => Promise<T>): Promise<T> {
  const accessToken = authStore.getState().accessToken
  try {
    return await call(accessToken)
  } catch (error) {
    if (!(error instanceof NightApiError) || error.status !== 401 || !accessToken) throw error
  }
  let renewed: string | null = null
  try {
    renewed = await authApi.reissue()
  } catch {
    // 재발급 실패. 아래에서 토큰 없이 받는다
  }
  return call(renewed)
}

/**
 * 하룻밤의 추천을 받아 온다. `enabled`가 false인 동안은 기다린다(설정과 위치를 읽기 전).
 * 로그인 상태가 바뀌면 내 장소가 들어가거나 빠지므로 다시 받는다.
 */
export function useNight(date: string | null, query: NightQuery, enabled: boolean): NightState {
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const [data, setData] = useState<NightRecommendation | null>(null)
  const [dataKey, setDataKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<NightApiError | null>(null)
  const [attempt, setAttempt] = useState(0)

  const url = nightUrl(date, query)
  const key = `${url}#${isAuthenticated ? "member" : "guest"}`
  const latest = useRef({ date, query })
  latest.current = { date, query }

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetchNightWithAuth(latest.current.date, latest.current.query, controller.signal)
      .then((result) => {
        setData(result)
        setDataKey(key)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(reason instanceof NightApiError ? reason : new NightApiError(0, "추천을 불러오지 못했습니다."))
        setLoading(false)
      })
    return () => controller.abort()
  }, [enabled, key, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  return { data, stale: data !== null && dataKey !== key, loading: loading || !enabled, error, reload }
}

export interface NightSummaryState {
  /** 지금 조건으로 받은 밤마다의 등급. 받는 중이거나 받지 못했으면 null이다 */
  summary: NightSummary | null
  loading: boolean
  reload: () => void
}

/**
 * 오늘 밤부터 7일의 밤마다 가장 좋은 등급. 밤 고르기에 곁들이는 값이라, 받지 못해도 화면을 막지 않고 조용히 비운다.
 * 조건이나 로그인 상태가 바뀌면 다시 받고, 그 사이에는 이전 조건의 등급을 보여주지 않는다.
 */
export function useNightSummary(query: NightQuery, enabled: boolean): NightSummaryState {
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const [state, setState] = useState<{ key: string; summary: NightSummary | null } | null>(null)
  const [attempt, setAttempt] = useState(0)

  const key = `${nightSummaryUrl(query)}#${isAuthenticated ? "member" : "guest"}`
  const latest = useRef(query)
  latest.current = query

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    withAuth((accessToken) => fetchNightSummary(latest.current, { accessToken, signal: controller.signal }))
      .then((summary) => setState({ key, summary }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        console.warn("[nights] 밤마다의 등급을 받지 못했습니다:", reason)
        setState({ key, summary: null })
      })
    return () => controller.abort()
  }, [enabled, key, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  const current = state?.key === key ? state : null

  return { summary: current?.summary ?? null, loading: current === null, reload }
}
