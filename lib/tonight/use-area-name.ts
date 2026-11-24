"use client"

import { useEffect, useState } from "react"
import { fetchAreaName } from "./geocode"
import type { Coordinates } from "./settings"

/** 이미 물어본 좌표의 답. 화면을 오가며 같은 좌표를 다시 묻지 않는다. null은 근처에 아무것도 없다는 답이다 */
const known = new Map<string, string | null>()

const keyOf = (position: Coordinates) => `${position.lat.toFixed(3)},${position.lon.toFixed(3)}`

/**
 * 좌표가 어느 지역인지 "강릉시 왕산면" 같은 이름으로 알려 준다. 아직 모르거나 받지 못했으면 null이다.
 * 이름은 화면을 알아보기 쉽게 하는 데만 쓰므로 실패해도 오류로 다루지 않는다.
 */
export function useAreaName(position: Coordinates | null): string | null {
  const key = position ? keyOf(position) : null
  const lat = position?.lat ?? null
  const lon = position?.lon ?? null
  const [resolved, setResolved] = useState<{ key: string; name: string | null } | null>(null)

  useEffect(() => {
    if (key === null || lat === null || lon === null) return
    if (known.has(key)) {
      setResolved({ key, name: known.get(key) ?? null })
      return
    }
    const controller = new AbortController()
    fetchAreaName({ lat, lon }, controller.signal)
      .then((name) => {
        known.set(key, name)
        setResolved({ key, name })
      })
      .catch(() => {
        // 이름 없이도 화면은 쓸 수 있다
      })
    return () => controller.abort()
  }, [key, lat, lon])

  return resolved && resolved.key === key ? resolved.name : null
}
