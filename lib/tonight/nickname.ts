/**
 * 닉네임 규칙. 서버(백엔드 저장소 `MemberDomainService`, docs/API.md "닉네임 수정")와 같다.
 * 앞뒤 공백을 떼고 2~16자, 한글과 영문과 숫자와 밑줄, 낱말 사이의 공백 하나만 받는다.
 */
export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 16

export type NicknameProblem = "short" | "long" | "chars" | "spaces"

const ALLOWED = /^[가-힣ㄱ-ㅣA-Za-z0-9_ ]*$/

/** 서버에 보낼 값. 자모로 풀린 한글(NFD)을 음절로 모으고 앞뒤 공백을 뗀다 */
export function cleanNickname(value: string): string {
  return value.normalize("NFC").trim()
}

/** 규칙에 어긋나는 까닭. 맞으면 null */
export function nicknameProblem(value: string): NicknameProblem | null {
  const name = cleanNickname(value)
  if (!ALLOWED.test(name)) return "chars"
  if (name.includes("  ")) return "spaces"
  if (name.length < NICKNAME_MIN) return "short"
  if (name.length > NICKNAME_MAX) return "long"
  return null
}

/** 다른 회원이 쓰고 있을 때. 서버는 대소문자를 가리지 않고 비교한다 */
export const NICKNAME_TAKEN_TEXT = "이미 다른 분이 쓰는 닉네임이에요."

/** 닉네임을 정하는 자리마다 붙이는 운영 안내(백엔드 저장소 docs/decisions.md 2026-11-28) */
export const NICKNAME_POLICY_NOTE = "선정적이거나 광고하는 닉네임은 알리지 않고 바뀔 수 있어요."

export const NICKNAME_PROBLEM_TEXT: Record<NicknameProblem, string> = {
  short: `${NICKNAME_MIN}자 이상 적어 주세요.`,
  long: `${NICKNAME_MAX}자까지 쓸 수 있어요.`,
  chars: "한글, 영문, 숫자, 밑줄(_)만 쓸 수 있어요.",
  spaces: "낱말 사이에는 공백을 하나만 둘 수 있어요.",
}
