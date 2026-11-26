"use client"

import { useState, type FormEvent } from "react"
import type { AxiosError } from "axios"
import { AuthRejected, authApi } from "@/lib/api/auth"
import { membersApi } from "@/lib/api/members"
import { Sheet } from "./sheet"

type Mode = "login" | "register"
type Provider = "kakao" | "naver" | "google"

const PROVIDERS: ReadonlyArray<{ value: Provider; label: string }> = [
  { value: "kakao", label: "카카오로 계속" },
  { value: "naver", label: "네이버로 계속" },
  { value: "google", label: "구글로 계속" },
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 서버와 같은 규칙: 8자 이상, 영문자, 숫자, 특수문자(!@#$%^&*)를 하나씩 이상 (백엔드 저장소 docs/API.md "회원가입")
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/

interface LoginSheetProps {
  /** 시트를 연 까닭. 저장하려다 연 것이면 로그인하면 바로 저장된다고 한 줄 알린다 */
  reason?: "save"
  onClose: () => void
  /** 이메일로 로그인하거나 가입을 마쳤을 때 */
  onDone: () => void
  /** 소셜 로그인으로 이 페이지를 떠나기 직전. 돌아와서 이어 갈 것을 남겨 둔다 */
  onLeave: () => void
}

/**
 * 보던 화면 위에 띄우는 로그인. 이메일 로그인과 가입은 이 안에서 끝난다. 카카오, 네이버, 구글은 그쪽 화면으로 갔다가
 * 돌아와야 해서 떠나기 전에 `onLeave`로 보던 것을 남긴다.
 */
export function LoginSheet({ reason, onClose, onDone, onLeave }: LoginSheetProps) {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

  const validate = (): string | null => {
    if (!EMAIL.test(email.trim())) return "이메일 주소를 확인해 주세요."
    if (mode === "login") return password ? null : "비밀번호를 입력해 주세요."
    if (!PASSWORD.test(password)) return "비밀번호는 8자 이상, 영문자와 숫자, 특수문자(!@#$%^&*)를 섞어 주세요."
    const name = nickname.trim()
    if (name.length < 2 || name.length > 20) return "닉네임은 2~20자로 정해 주세요."
    return null
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === "login") {
        await authApi.login({ email: email.trim(), password })
      } else {
        await authApi.register({ email: email.trim(), password, nickname: nickname.trim() })
      }
      await membersApi.getMe()
      onDone()
    } catch (caught) {
      setError(messageOf(caught, mode))
    } finally {
      setBusy(false)
    }
  }

  const leaveFor = (provider: Provider) => {
    onLeave()
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
    window.location.href = `${baseUrl}/oauth2/authorization/${provider}`
  }

  return (
    <Sheet title={mode === "login" ? "로그인" : "가입하기"} onClose={onClose}>
      <div className="login">
        {reason === "save" ? <p className="login-why">로그인하면 바로 저장돼요</p> : null}
        <div className="login-social">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.value}
              type="button"
              className="btn"
              data-provider={provider.value}
              onClick={() => leaveFor(provider.value)}
            >
              {provider.label}
            </button>
          ))}
        </div>
        <div className="login-or">또는 이메일</div>
        <form className="login-form" onSubmit={submit} noValidate>
          <input
            className="text-input"
            type="email"
            autoComplete="email"
            placeholder="이메일"
            aria-label="이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="text-input"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="비밀번호"
            aria-label="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {mode === "register" ? (
            <input
              className="text-input"
              autoComplete="nickname"
              placeholder="닉네임"
              aria-label="닉네임"
              maxLength={20}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
          ) : null}
          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "잠시만요" : mode === "login" ? "로그인" : "가입하기"}
          </button>
        </form>
        <button type="button" className="linkish" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "처음이면 가입하기" : "이미 계정이 있으면 로그인"}
        </button>
      </div>
    </Sheet>
  )
}

/** 서버의 상태 코드로 사유를 고른다. message 문자열에는 조건을 걸지 않는다(백엔드 저장소 docs/API.md "오류를 구분하는 법") */
function messageOf(error: unknown, mode: Mode): string {
  const status = error instanceof AuthRejected ? error.status : (error as AxiosError).response?.status
  if (status === undefined) return "서버에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요."
  if (mode === "login" && status === 401) return "이메일이나 비밀번호가 맞지 않아요."
  if (mode === "register" && status === 409) return "이미 가입한 이메일이에요."
  if (status === 400) return "입력한 내용을 확인해 주세요."
  return "잠시 뒤에 다시 해 주세요."
}
