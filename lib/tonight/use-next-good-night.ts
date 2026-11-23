"use client"

import { useEffect, useState } from "react"
import { buildNightView } from "./facts"
import type { NightPlace, NightQuery } from "./types"
import { fetchNightWithAuth } from "./use-night"

export type NextGoodNight =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "found"; date: string; place: NightPlace }
  /** 남은 날짜를 모두 봤지만 가볼 만한 밤이 없다 */
  | { status: "none" }

/**
 * 가볼 만한 곳이 없는 밤에, 그 뒤의 날짜를 차례로 받아 가볼 만한 곳이 있는 첫 밤을 찾는다.
 * `laterDates`가 비어 있거나 `active`가 false면 찾지 않는다. 도중에 실패하면 조용히 그만둔다.
 */
export function useNextGoodNight(active: boolean, laterDates: readonly string[], query: NightQuery): NextGoodNight {
  const [result, setResult] = useState<NextGoodNight>({ status: "idle" })
  const datesKey = laterDates.join(",")
  const queryKey = JSON.stringify(query)

  useEffect(() => {
    if (!active || datesKey === "") {
      setResult({ status: "idle" })
      return
    }
    const controller = new AbortController()
    const dates = datesKey.split(",")
    const parsedQuery = JSON.parse(queryKey) as NightQuery
    setResult({ status: "searching" })

    void (async () => {
      try {
        for (const date of dates) {
          const night = await fetchNightWithAuth(date, parsedQuery, controller.signal)
          const top = buildNightView(night).top
          if (top) {
            setResult({ status: "found", date, place: top })
            return
          }
        }
        setResult({ status: "none" })
      } catch {
        if (!controller.signal.aborted) setResult({ status: "idle" })
      }
    })()

    return () => controller.abort()
  }, [active, datesKey, queryKey])

  return result
}
