"use client"

import { useEffect, useState, type FormEvent } from "react"
import type { AxiosError } from "axios"
import { AuthRejected, authApi } from "@/lib/api/auth"
import { membersApi } from "@/lib/api/members"
import {
  NICKNAME_MAX,
  NICKNAME_POLICY_NOTE,
  NICKNAME_PROBLEM_TEXT,
  NICKNAME_TAKEN_TEXT,
  cleanNickname,
  nicknameProblem,
} from "@/lib/tonight/nickname"
import { useNicknameTaken } from "@/lib/tonight/use-nickname-taken"
import { Sheet } from "./sheet"

type Mode = "login" | "register" | "reset"
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
  const [tried, setTried] = useState(false)
  // 가입할 때 직접 체크해야 하는 약관 동의(백엔드 저장소 docs/API.md "회원가입"). 미리 체크해 두지 않는다
  const [agreed, setAgreed] = useState(false)
  // 이메일 인증(백엔드 저장소 docs/API.md "가입 인증 코드 받기"). 코드를 보낸 주소와 다시 받을 수 있는 시각을 둔다
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [sending, setSending] = useState(false)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const emailKey = email.trim().toLowerCase()
  const codeSent = codeSentTo !== null && codeSentTo === emailKey
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000))

  useEffect(() => {
    if (resendAt <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [resendAt])

  // 닉네임은 닉네임 수정과 같은 규칙(백엔드 저장소 docs/API.md "닉네임 수정")을 보고, 다른 회원이 쓰는지도 미리 본다
  const nicknameIssue = mode === "register" ? nicknameProblem(nickname) : null
  const nicknameTaken = useNicknameTaken(nickname, mode !== "register")
  const nicknameError =
    mode !== "register"
      ? null
      : nicknameIssue && (nicknameIssue !== "short" || tried)
        ? NICKNAME_PROBLEM_TEXT[nicknameIssue]
        : nicknameTaken
          ? NICKNAME_TAKEN_TEXT
          : null

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setTried(false)
    // 가입 코드와 재설정 코드는 서버에서 따로 다룬다. 받은 코드를 다른 쪽으로 들고 가지 않는다
    setCodeSentTo(null)
    setCode("")
    setResendAt(0)
  }

  const validate = (): string | null => {
    if (!EMAIL.test(email.trim())) return "이메일 주소를 확인해 주세요."
    if (mode === "login") return password ? null : "비밀번호를 입력해 주세요."
    if (!codeSent) return mode === "reset" ? "이메일로 재설정 코드를 받아 주세요." : "이메일로 인증 코드를 받아 주세요."
    if (!/^\d{6}$/.test(code.trim())) return "메일로 받은 인증 코드 여섯 자리를 적어 주세요."
    if (!PASSWORD.test(password)) return "비밀번호는 8자 이상, 영문자와 숫자, 특수문자(!@#$%^&*)를 섞어 주세요."
    return null
  }

  const sendCode = async () => {
    if (sending || waitSeconds > 0) return
    if (!EMAIL.test(email.trim())) {
      setError("이메일 주소를 확인해 주세요.")
      return
    }
    setSending(true)
    setError(null)
    try {
      if (mode === "reset") await authApi.sendPasswordResetCode(email.trim())
      else await authApi.sendEmailCode(email.trim())
      setCodeSentTo(emailKey)
      setCode("")
      // 서버는 같은 이메일로 1분에 한 번만 보낸다
      setResendAt(Date.now() + 60_000)
      setNow(Date.now())
    } catch (caught) {
      setError(codeMessageOf(caught))
    } finally {
      setSending(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setTried(true)
    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }
    // 닉네임 사유는 입력란 아래에 적혀 있다
    if (mode === "register" && (nicknameIssue || nicknameTaken)) {
      setError(null)
      return
    }
    if (mode === "register" && !agreed) {
      setError("만 14세 이상이고 약관에 동의해 주세요.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === "login") {
        await authApi.login({ email: email.trim(), password })
      } else if (mode === "reset") {
        await authApi.resetPassword(email.trim(), code.trim(), password)
        // 바꾼 비밀번호로 바로 로그인한다
        await authApi.login({ email: email.trim(), password })
      } else {
        const name = cleanNickname(nickname)
        // 회원가입의 409는 이메일과 닉네임 두 가지라서 닉네임은 먼저 물어 가린다
        if (!(await membersApi.isNicknameAvailable(name))) {
          setError(NICKNAME_TAKEN_TEXT)
          return
        }
        await authApi.register({
          email: email.trim(),
          password,
          nickname: name,
          emailCode: code.trim(),
          agreedToTerms: true,
        })
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
    <Sheet title={mode === "login" ? "로그인" : mode === "reset" ? "비밀번호 찾기" : "가입하기"} onClose={onClose}>
      <div className="login">
        {reason === "save" ? <p className="login-why">로그인하면 바로 북마크돼요</p> : null}
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
        {/* 소셜 로그인은 처음 누르면 곧 가입이라 체크 칸 대신 고지로 동의를 받는다(백엔드 저장소 docs/decisions.md 2026-11-28) */}
        <p className="login-terms">
          소셜 계정으로 처음 계속하면 만 14세 이상이고 <a href="/terms">이용약관</a>과{" "}
          <a href="/privacy">개인정보처리방침</a>에 동의하는 것으로 봐요.
        </p>
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
          {mode !== "login" ? (
            <div className="code-row">
              {codeSent ? (
                <input
                  className="text-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="인증 코드 6자리"
                  aria-label="인증 코드"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                />
              ) : null}
              <button type="button" className="btn" disabled={sending || waitSeconds > 0} onClick={() => void sendCode()}>
                {sending
                  ? "보내는 중"
                  : waitSeconds > 0
                    ? `다시 받기 ${waitSeconds}초`
                    : codeSent
                      ? "다시 받기"
                      : mode === "reset"
                        ? "재설정 코드 받기"
                        : "인증 코드 받기"}
              </button>
            </div>
          ) : null}
          {mode === "reset" && codeSent ? <p className="field-note">가입한 이메일이면 코드가 가요. 메일함을 확인해 주세요.</p> : null}
          <input
            className="text-input"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "reset" ? "새 비밀번호" : "비밀번호"}
            aria-label={mode === "reset" ? "새 비밀번호" : "비밀번호"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {mode === "register" ? (
            <>
              <input
                className="text-input"
                autoComplete="nickname"
                placeholder="닉네임"
                aria-label="닉네임"
                maxLength={NICKNAME_MAX + 8}
                aria-invalid={nicknameError ? true : undefined}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
              {nicknameError ? (
                <p className="field-error register-nickname-error" role="alert">
                  {nicknameError}
                </p>
              ) : null}
              <p className="field-note">{NICKNAME_POLICY_NOTE}</p>
              <label className="login-agree">
                <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                만 14세 이상이고 이용약관과 개인정보처리방침에 동의해요
              </label>
            </>
          ) : null}
          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "잠시만요" : mode === "login" ? "로그인" : mode === "reset" ? "비밀번호 바꾸기" : "가입하기"}
          </button>
        </form>
        <button type="button" className="linkish" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "처음이면 가입하기" : "이미 계정이 있으면 로그인"}
        </button>
        {mode === "login" ? (
          <button type="button" className="linkish" onClick={() => switchMode("reset")}>
            비밀번호를 잊었어요
          </button>
        ) : null}
      </div>
    </Sheet>
  )
}

/** 서버의 상태 코드로 사유를 고른다. message 문자열에는 조건을 걸지 않는다(백엔드 저장소 docs/API.md "오류를 구분하는 법") */
function messageOf(error: unknown, mode: Mode): string {
  const status = error instanceof AuthRejected ? error.status : (error as AxiosError).response?.status
  if (status === undefined) return "서버에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요."
  if (mode === "login" && status === 401) return "이메일이나 비밀번호가 맞지 않아요."
  if (mode === "login" && status === 429) return "여러 번 틀려서 15분 동안 로그인할 수 없어요. 비밀번호를 잊었다면 찾아 주세요."
  if (mode === "reset" && status === 400) return "재설정 코드가 맞지 않거나 시간이 지났어요. 다시 확인하거나 새로 받아 주세요."
  if (mode === "register" && status === 409) return "이미 가입한 이메일이에요."
  // 닉네임과 비밀번호는 보내기 전에 걸러 두므로 가입의 400은 대개 인증 코드다
  if (mode === "register" && status === 400) return "인증 코드가 맞지 않거나 시간이 지났어요. 다시 확인하거나 새로 받아 주세요."
  if (status === 400) return "입력한 내용을 확인해 주세요."
  return "잠시 뒤에 다시 해 주세요."
}

/** 인증 코드를 보내지 못한 까닭. 상태 코드로만 가린다 */
function codeMessageOf(error: unknown): string {
  const status = error instanceof AuthRejected ? error.status : (error as AxiosError).response?.status
  if (status === undefined) return "서버에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요."
  if (status === 409) return "이미 가입한 이메일이에요."
  if (status === 429) return "인증 코드를 너무 자주 받았어요. 잠시 뒤에 다시 받아 주세요."
  if (status === 400) return "이메일 주소를 확인해 주세요."
  return "인증 메일을 보내지 못했어요. 잠시 뒤에 다시 해 주세요."
}
