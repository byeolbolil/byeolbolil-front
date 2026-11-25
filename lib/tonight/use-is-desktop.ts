"use client"

import { useSyncExternalStore } from "react"

/** 왼쪽 지도와 오른쪽 패널로 나누는 너비. tonight.css의 미디어 쿼리와 같아야 한다. */
const DESKTOP_QUERY = "(min-width: 1080px)"
/** 오른쪽 패널을 장소 카드와 후보 목록 두 칸으로 나누는 너비. tonight.css의 미디어 쿼리와 같아야 한다. */
const WIDE_QUERY = "(min-width: 1200px)"

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** 넓은 화면인지. 서버에서는 알 수 없어서 좁은 화면으로 본다. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY)
}

/** 후보 목록이 장소 카드 옆에 제 칸을 가질 만큼 넓은 화면인지. */
export function useIsWide(): boolean {
  return useMediaQuery(WIDE_QUERY)
}
