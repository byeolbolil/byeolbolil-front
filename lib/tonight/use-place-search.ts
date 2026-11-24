"use client"

import { useEffect, useState } from "react"
import { cleanQuery, searchPlaces, type FoundPlace } from "./geocode"

export interface PlaceSearchState {
  /** idle: 검색어가 너무 짧다. loading: 찾는 중. done: 결과가 왔다. error: 찾지 못했다 */
  status: "idle" | "loading" | "done" | "error"
  /** 찾는 동안에는 바로 앞 검색의 결과를 그대로 둔다. 목록이 글자마다 깜빡이지 않게 하기 위해서다 */
  places: FoundPlace[]
}

/** 입력이 이만큼 멈췄을 때 찾는다. 글자마다 서버를 부르지 않기 위해서다 */
const DEBOUNCE_MS = 300

const IDLE: PlaceSearchState = { status: "idle", places: [] }

/** 입력 중인 검색어로 장소를 찾는다. 검색어가 바뀌면 앞선 요청은 취소한다 */
export function usePlaceSearch(rawQuery: string): PlaceSearchState {
  const query = cleanQuery(rawQuery)
  const [state, setState] = useState<PlaceSearchState>(IDLE)

  useEffect(() => {
    if (!query) {
      setState(IDLE)
      return
    }
    const controller = new AbortController()
    setState((previous) => ({ status: "loading", places: previous.places }))
    const timer = window.setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then((places) => setState({ status: "done", places }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          console.warn("[place-search] 검색 실패:", error)
          setState({ status: "error", places: [] })
        })
    }, DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return state
}
