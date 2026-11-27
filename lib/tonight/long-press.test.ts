import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createLongPress } from "./long-press"

describe("꾹 누르기", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("0.5초 동안 누르고 있으면 누른 자리로 부른다", () => {
    const onPress = vi.fn()
    const press = createLongPress(onPress)
    press.start(100, 100, 1, "here")
    vi.advanceTimersByTime(499)
    expect(onPress).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onPress).toHaveBeenCalledWith("here")
  })

  it("그 전에 떼면 부르지 않는다", () => {
    const onPress = vi.fn()
    const press = createLongPress(onPress)
    press.start(100, 100, 1, "here")
    vi.advanceTimersByTime(300)
    press.cancel()
    vi.advanceTimersByTime(1000)
    expect(onPress).not.toHaveBeenCalled()
  })

  it("10px까지 흔들리는 것은 봐주고, 그보다 움직이면 지도를 옮기는 것으로 본다", () => {
    const onPress = vi.fn()
    const press = createLongPress(onPress)
    press.start(100, 100, 1, "a")
    press.move(106, 108)
    vi.advanceTimersByTime(500)
    expect(onPress).toHaveBeenCalledTimes(1)

    press.start(100, 100, 1, "b")
    press.move(111, 100)
    vi.advanceTimersByTime(500)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it("두 손가락이면 확대하는 것이라 세지 않는다", () => {
    const onPress = vi.fn()
    const press = createLongPress(onPress)
    press.start(100, 100, 1, "a")
    press.start(100, 100, 2, "a")
    vi.advanceTimersByTime(1000)
    expect(onPress).not.toHaveBeenCalled()
  })
})
