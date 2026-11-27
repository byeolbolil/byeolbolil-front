"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"

/** 화면 위에 겹쳐 여는 것. 장소 화면(좁은 화면에서 목록을 덮는다)과 시트 */
export type Layer = "detail" | "sheet"

/** 브라우저 기록의 한 칸이 몇 번째 층인지. 층을 열 때 쌓은 칸에만 있다 */
export function layerDepth(state: unknown): number {
  const depth = (state as { bbLayer?: unknown } | null)?.bbLayer
  return typeof depth === "number" && depth > 0 ? depth : 0
}

/**
 * 겹쳐 연 화면마다 브라우저 기록을 한 칸씩 쌓아서, 휴대폰의 뒤로 가기가 사이트를 떠나지 않고 맨 위의 층을 닫게 한다.
 * 칸마다 몇 번째 층인지 적어 두고, 뒤로 가서 닿은 칸보다 위에 있던 층을 `onBack`으로 닫는다.
 *
 * 화면의 버튼으로 층을 닫으면 쌓아 둔 칸도 되돌린다. 한 번의 동작에서 여러 층을 닫으면(달력에서 밤을 고르면 시트와
 * 장소 화면이 함께 닫힌다) 되돌릴 칸을 모아 두었다가 한 번에 되돌린다. 뒤로 가기를 연달아 부르면 브라우저마다 다르게 처리한다.
 * 되돌리기 전에 다시 층을 열면 새 칸을 쌓지 않고 되돌릴 칸 하나를 그대로 쓴다.
 */
export function useHistoryLayers(onBack: (layer: Layer) => void) {
  const layers = useRef<Layer[]>([])
  const pending = useRef(0)
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    const onPopState = () => {
      const depth = layerDepth(window.history.state)
      while (layers.current.length > depth) {
        const layer = layers.current.pop()
        if (layer) onBackRef.current(layer)
      }
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  /** 층을 연다. 이미 열려 있으면(다른 시트로 바꾸거나 다른 장소를 고를 때) 칸을 더 쌓지 않는다 */
  const open = useCallback((layer: Layer) => {
    if (layers.current.includes(layer)) return
    layers.current.push(layer)
    if (pending.current > 0) {
      pending.current -= 1
      return
    }
    window.history.pushState({ ...window.history.state, bbLayer: layers.current.length }, "")
  }, [])

  /** 화면의 버튼으로 층을 닫을 때. 그 위에 열려 있던 층도 함께 닫히고, 쌓아 둔 칸을 되돌린다 */
  const close = useCallback((layer: Layer) => {
    const index = layers.current.lastIndexOf(layer)
    if (index < 0) return
    const above = layers.current.slice(index + 1)
    const steps = layers.current.length - index
    layers.current.length = index
    if (pending.current === 0) {
      queueMicrotask(() => {
        const count = pending.current
        pending.current = 0
        if (count > 0) window.history.go(-count)
      })
    }
    pending.current += steps
    for (const upper of above.reverse()) onBackRef.current(upper)
  }, [])

  return useMemo(() => ({ open, close }), [open, close])
}
