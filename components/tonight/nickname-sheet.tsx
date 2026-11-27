"use client"

import { useState, type FormEvent } from "react"
import type { AxiosError } from "axios"
import { AuthRejected } from "@/lib/api/auth"
import { membersApi } from "@/lib/api/members"
import { NICKNAME_MAX, NICKNAME_PROBLEM_TEXT, cleanNickname, nicknameProblem } from "@/lib/tonight/nickname"
import { Sheet } from "./sheet"

interface NicknameSheetProps {
  /** 지금 닉네임. 입력란에 미리 넣어 둔다 */
  current: string
  onClose: () => void
  /** 서버에 저장하고 머리의 이름까지 바꾼 뒤 */
  onDone: (nickname: string) => void
}

/** 계정 메뉴에서 여는 닉네임 바꾸기. 규칙에 어긋나면 보내지 않고 까닭을 입력란 아래에 적는다. */
export function NicknameSheet({ current, onClose, onDone }: NicknameSheetProps) {
  const [value, setValue] = useState(current)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const problem = nicknameProblem(value)
  const unchanged = cleanNickname(value) === current
  // 짧다는 것은 더 적으면 풀리므로, 적는 중에는 말하지 않고 저장을 누른 뒤에만 말한다
  const shown = problem && (problem !== "short" || tried) ? NICKNAME_PROBLEM_TEXT[problem] : failure

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || unchanged) return
    setTried(true)
    if (problem) return
    setSaving(true)
    setFailure(null)
    try {
      const user = await membersApi.updateNickname(cleanNickname(value))
      onDone(user.nickname)
    } catch (caught) {
      setFailure(messageOf(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title="닉네임 바꾸기" onClose={onClose}>
      <form className="q" onSubmit={submit} noValidate>
        <label className="ql" htmlFor="nickname">
          뭐라고 불러 드릴까요?
        </label>
        <input
          id="nickname"
          className="text-input"
          value={value}
          // 앞뒤 공백은 떼고 세므로 규칙보다 조금 넉넉하게 받는다. 넘치면 까닭을 적는다
          maxLength={NICKNAME_MAX + 8}
          autoComplete="nickname"
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? "nickname-error" : undefined}
          onChange={(event) => {
            setValue(event.target.value)
            setFailure(null)
          }}
        />
        {shown ? (
          <p id="nickname-error" className="field-error" role="alert">
            {shown}
          </p>
        ) : null}
        <div className="actions">
          <button type="submit" className="btn primary" disabled={saving || unchanged}>
            {saving ? "바꾸는 중" : "저장"}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
        </div>
      </form>
    </Sheet>
  )
}

/** 서버의 상태 코드로 사유를 고른다. message 문자열에는 조건을 걸지 않는다(백엔드 저장소 docs/API.md "오류를 구분하는 법") */
function messageOf(error: unknown): string {
  const status = error instanceof AuthRejected ? error.status : (error as AxiosError).response?.status
  if (status === undefined) return "서버에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요."
  if (status === 401) return "로그인이 풀렸어요. 다시 로그인한 뒤에 바꿔 주세요."
  if (status === 400) return "쓸 수 없는 닉네임이에요."
  return "잠시 뒤에 다시 해 주세요."
}
