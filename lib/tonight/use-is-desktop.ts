"use client"

import { useSyncExternalStore } from "react"

/** 왼쪽 지도와 오른쪽 패널로 나누는 너비. tonight.css의 미디어 쿼리와 같아야 한다. */
const DESKTOP_QUERY = "(min-width: 1080px)"

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DESKTOP_QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

/** 넓은 화면인지. 서버에서는 알 수 없어서 좁은 화면으로 본다. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  )
}
