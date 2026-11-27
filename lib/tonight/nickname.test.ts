import { describe, expect, it } from "vitest"
import { cleanNickname, nicknameProblem } from "./nickname"

describe("닉네임 규칙", () => {
  it("한글, 영문, 숫자, 밑줄과 낱말 사이의 공백 하나는 받는다", () => {
    for (const name of ["별지", "별지기", "stargazer", "star_gazer", "별지기2026", "Gildong Hong", "ㅋㅋ"]) {
      expect(nicknameProblem(name), name).toBeNull()
    }
  })

  it("1자는 짧고 2자부터 받는다", () => {
    expect(nicknameProblem("별")).toBe("short")
    expect(nicknameProblem("별지")).toBeNull()
  })

  it("16자까지 받고 17자는 길다", () => {
    expect(nicknameProblem("별".repeat(16))).toBeNull()
    expect(nicknameProblem("별".repeat(17))).toBe("long")
  })

  it("앞뒤 공백은 떼고 센다", () => {
    expect(cleanNickname("  별지기  ")).toBe("별지기")
    expect(nicknameProblem(` ${"별".repeat(16)} `)).toBeNull()
    expect(nicknameProblem(" 별 ")).toBe("short")
  })

  it("비었거나 공백만 있으면 짧다", () => {
    expect(nicknameProblem("")).toBe("short")
    expect(nicknameProblem("   ")).toBe("short")
  })

  it("연속 공백은 받지 않고, 탭과 줄바꿈과 전각 공백은 쓸 수 없는 글자다", () => {
    expect(nicknameProblem("별  지기")).toBe("spaces")
    expect(nicknameProblem("별\t지기")).toBe("chars")
    expect(nicknameProblem("별\n지기")).toBe("chars")
    expect(nicknameProblem("별　지기")).toBe("chars")
  })

  it("이모지, 기호, 다른 문자는 받지 않는다", () => {
    for (const name of ["별지기⭐", "🌙달", "별-지기", "별.지기", "<script>", "ほし", "星星"]) {
      expect(nicknameProblem(name), name).toBe("chars")
    }
  })

  it("자모로 풀린 한글은 음절로 모아 센다", () => {
    const decomposed = "별지기".normalize("NFD")
    expect(decomposed.length).toBeGreaterThan(3)
    expect(cleanNickname(decomposed)).toBe("별지기")
    expect(nicknameProblem(decomposed)).toBeNull()
  })
})
