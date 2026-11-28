"use client"

import { useState, type FormEvent } from "react"
import type { AxiosError } from "axios"
import { AuthRejected } from "@/lib/api/auth"
import { membersApi } from "@/lib/api/members"
import { Sheet } from "./sheet"

/** 제공자 이름과 "~와/과"를 붙인 꼴 */
const PROVIDER_NAME: Record<string, [string, string]> = {
  KAKAO: ["카카오", "카카오와"],
  NAVER: ["네이버", "네이버와"],
  GOOGLE: ["구글", "구글과"],
}

interface WithdrawSheetProps {
  /** 내 정보의 가입 방식. LOCAL이면 비밀번호를 묻고, 소셜이면 그 제공자에 한 번 더 로그인하러 간다 */
  provider: string | undefined
  onClose: () => void
  /** 이메일 회원이 탈퇴를 마친 뒤. 소셜 회원은 제공자를 거쳐 첫 화면으로 돌아오므로 부르지 않는다 */
  onDone: () => void
}

/**
 * 탈퇴 확인 시트. 지워지는 것을 한 번 보여 주고 확인을 받는다(백엔드 저장소 docs/API.md "탈퇴").
 * 소셜 회원은 가입한 서비스에 다시 로그인해야 탈퇴가 끝나고, 그때 그 서비스와 별볼일의 연결도 끊긴다.
 */
export function WithdrawSheet({ provider, onClose, onDone }: WithdrawSheetProps) {
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [social, socialWith] = (provider && PROVIDER_NAME[provider]) || []

  const leaveForProvider = async () => {
    if (busy) return
    setBusy(true)
    setFailure(null)
    try {
      window.location.href = await membersApi.withdrawalUrl()
    } catch (caught) {
      setFailure(messageOf(caught))
      setBusy(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (!password) {
      setFailure("비밀번호를 넣어 주세요.")
      return
    }
    setBusy(true)
    setFailure(null)
    try {
      await membersApi.withdrawWithPassword(password)
      onDone()
    } catch (caught) {
      setFailure(messageOf(caught))
      setBusy(false)
    }
  }

  return (
    <Sheet title="탈퇴하기" onClose={onClose}>
      <p className="sheet-note">계정과 북마크가 바로 지워지고 되돌릴 수 없어요.</p>
      {social ? (
        <div className="q">
          <p className="field-note">{social}에 한 번 더 로그인하면 탈퇴가 끝나요. {socialWith} 별볼일의 연결도 함께 끊어요.</p>
          {failure ? (
            <p className="field-error" role="alert">
              {failure}
            </p>
          ) : null}
          <div className="actions">
            <button type="button" className="btn danger" disabled={busy} onClick={() => void leaveForProvider()}>
              {busy ? "이동하는 중" : `${social}로 확인하고 탈퇴`}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              취소
            </button>
          </div>
        </div>
      ) : (
        <form className="q" onSubmit={submit} noValidate>
          <label className="ql" htmlFor="withdraw-password">
            비밀번호
          </label>
          <input
            id="withdraw-password"
            className="text-input"
            type="password"
            autoComplete="current-password"
            value={password}
            aria-invalid={failure ? true : undefined}
            aria-describedby={failure ? "withdraw-error" : undefined}
            onChange={(event) => {
              setPassword(event.target.value)
              setFailure(null)
            }}
          />
          {failure ? (
            <p id="withdraw-error" className="field-error" role="alert">
              {failure}
            </p>
          ) : null}
          <div className="actions">
            <button type="submit" className="btn danger" disabled={busy}>
              {busy ? "탈퇴하는 중" : "탈퇴"}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              취소
            </button>
          </div>
        </form>
      )}
    </Sheet>
  )
}

/** 서버의 상태 코드로 사유를 고른다. message 문자열에는 조건을 걸지 않는다(백엔드 저장소 docs/API.md "오류를 구분하는 법") */
function messageOf(error: unknown): string {
  const status = error instanceof AuthRejected ? error.status : (error as AxiosError).response?.status
  if (status === undefined) return "서버에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요."
  if (status === 401) return "로그인이 풀렸어요. 다시 로그인한 뒤에 해 주세요."
  if (status === 400) return "비밀번호가 맞지 않아요."
  return "잠시 뒤에 다시 해 주세요."
}
