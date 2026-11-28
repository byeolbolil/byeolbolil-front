"use client"

import { useState, type FormEvent } from "react"
import type { AxiosError } from "axios"
import { AuthRejected } from "@/lib/api/auth"
import { membersApi } from "@/lib/api/members"
import { Sheet } from "./sheet"

// 서버와 같은 규칙: 8자 이상, 영문자, 숫자, 특수문자(!@#$%^&*)를 하나씩 이상 (백엔드 저장소 docs/API.md "회원가입")
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/

interface PasswordSheetProps {
  onClose: () => void
  /** 바꾸고 새 토큰까지 받은 뒤 */
  onDone: () => void
}

/**
 * 이메일 회원의 비밀번호 바꾸기. 바꾸면 다른 기기에서는 로그아웃되고 이 기기는 로그인이 이어진다.
 */
export function PasswordSheet({ onClose, onDone }: PasswordSheetProps) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (!current) {
      setFailure("지금 비밀번호를 넣어 주세요.")
      return
    }
    if (!PASSWORD.test(next)) {
      setFailure("새 비밀번호는 8자 이상, 영문자와 숫자, 특수문자(!@#$%^&*)를 섞어 주세요.")
      return
    }
    setBusy(true)
    setFailure(null)
    try {
      await membersApi.changePassword(current, next)
      onDone()
    } catch (caught) {
      setFailure(messageOf(caught))
      setBusy(false)
    }
  }

  return (
    <Sheet title="비밀번호 바꾸기" onClose={onClose}>
      <form className="q" onSubmit={submit} noValidate>
        <label className="ql" htmlFor="password-current">
          지금 비밀번호
        </label>
        <input
          id="password-current"
          className="text-input"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => {
            setCurrent(event.target.value)
            setFailure(null)
          }}
        />
        <label className="ql" htmlFor="password-next">
          새 비밀번호
        </label>
        <input
          id="password-next"
          className="text-input"
          type="password"
          autoComplete="new-password"
          value={next}
          aria-invalid={failure ? true : undefined}
          aria-describedby={failure ? "password-error" : undefined}
          onChange={(event) => {
            setNext(event.target.value)
            setFailure(null)
          }}
        />
        {failure ? (
          <p id="password-error" className="field-error" role="alert">
            {failure}
          </p>
        ) : null}
        <div className="actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "바꾸는 중" : "바꾸기"}
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
  if (status === 401) return "로그인이 풀렸어요. 다시 로그인한 뒤에 해 주세요."
  if (status === 400) return "지금 비밀번호가 맞지 않아요."
  return "잠시 뒤에 다시 해 주세요."
}
