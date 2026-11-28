import axios from "axios"
import { afterEach, describe, expect, it, vi } from "vitest"
import { requestReissue } from "./reissue"

vi.mock("axios", () => ({ default: { post: vi.fn() } }))
const post = vi.mocked(axios.post)

const reply = (accessToken: string) => ({ data: { data: { accessToken } } })

describe("requestReissue", () => {
  afterEach(() => post.mockReset())

  it("겹친 재발급은 요청 하나로 모은다", async () => {
    let answer: (value: unknown) => void = () => {}
    post.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
    const first = requestReissue("https://api")
    const second = requestReissue("https://api")
    answer(reply("token-1"))
    expect(await first).toBe("token-1")
    expect(await second).toBe("token-1")
    expect(post).toHaveBeenCalledTimes(1)
  })

  it("앞 요청이 끝난 뒤의 재발급은 새로 보낸다", async () => {
    post.mockResolvedValueOnce(reply("token-1")).mockResolvedValueOnce(reply("token-2"))
    expect(await requestReissue("https://api")).toBe("token-1")
    expect(await requestReissue("https://api")).toBe("token-2")
    expect(post).toHaveBeenCalledTimes(2)
  })

  it("실패한 뒤에는 다음 재발급을 다시 보낸다", async () => {
    post.mockRejectedValueOnce(new Error("401")).mockResolvedValueOnce(reply("token-2"))
    await expect(requestReissue("https://api")).rejects.toThrow("401")
    expect(await requestReissue("https://api")).toBe("token-2")
  })

  it("토큰이 없는 응답은 실패로 본다", async () => {
    post.mockResolvedValueOnce({ data: { data: {} } })
    await expect(requestReissue("https://api")).rejects.toThrow("Access Token")
  })
})
