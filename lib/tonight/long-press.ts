/**
 * 꾹 누르기를 알아본다. 손가락을 댄 채 `delay` 동안 `slop`보다 멀리 움직이지 않으면 `onPress`를 부른다.
 * 그 전에 떼거나, 움직이거나, 두 번째 손가락이 닿으면(두 손가락으로 확대) 취소한다.
 *
 * 0.5초와 10px는 근거 있는 기준이 아니라 휴대폰들의 길게 누르기와 비슷하게 맞춘 값이다.
 * Android의 기본 길게 누르기는 0.4~0.5초이고, 손가락이 이보다 조금 움직이는 것은 누르는 동안 흔하다.
 */
export const LONG_PRESS_MS = 500
export const LONG_PRESS_SLOP_PX = 10

export interface LongPress<T> {
  /** 손가락이 닿았을 때. 손가락이 하나일 때만 센다 */
  start: (x: number, y: number, touches: number, payload: T) => void
  move: (x: number, y: number) => void
  /** 손가락을 떼거나, 지도가 움직이기 시작하는 등 누르기가 끝났을 때 */
  cancel: () => void
}

export function createLongPress<T>(
  onPress: (payload: T) => void,
  { delay = LONG_PRESS_MS, slop = LONG_PRESS_SLOP_PX }: { delay?: number; slop?: number } = {},
): LongPress<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let origin: { x: number; y: number } | null = null

  const cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    origin = null
  }

  return {
    start(x, y, touches, payload) {
      cancel()
      if (touches !== 1) return
      origin = { x, y }
      timer = setTimeout(() => {
        timer = null
        origin = null
        onPress(payload)
      }, delay)
    },
    move(x, y) {
      if (!origin) return
      if (Math.hypot(x - origin.x, y - origin.y) > slop) cancel()
    },
    cancel,
  }
}
