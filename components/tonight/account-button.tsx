"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/api/authApi"
import { authStore } from "@/lib/store/authStore"
import { PersonIcon } from "./icons"

interface AccountButtonProps {
  /** 저장된 로그인을 확인하는 중인지. 그동안은 아무것도 보이지 않는다. "로그인"이 잠깐 떴다 사라지지 않게 하려는 것이다 */
  pending: boolean
  /** 로그인 창을 연다. 다른 페이지로 옮겨 가지 않는다 */
  onLogin: () => void
  /** 닉네임 바꾸는 시트를 연다 */
  onEditNickname: () => void
  /** 비밀번호 바꾸는 시트를 연다. 이메일 회원에게만 메뉴가 보인다 */
  onChangePassword: () => void
  /** 탈퇴 확인 시트를 연다 */
  onWithdraw: () => void
}

/**
 * 머리의 로그인 상태. 로그인하지 않았으면 "로그인", 했으면 닉네임을 보여주고 누르면 닉네임 바꾸기, 로그아웃, 탈퇴가 나온다.
 * 계정 정보가 닉네임뿐이라 회원 페이지를 따로 두지 않고 이 메뉴에 모은다.
 * 지금 로그인돼 있는지를 어느 화면에서나 알 수 있게 하는 자리다.
 */
export function AccountButton({ pending, onLogin, onEditNickname, onChangePassword, onWithdraw }: AccountButtonProps) {
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const nickname = authStore((state) => state.user?.nickname)
  const isLocal = authStore((state) => state.user?.authProvider === "LOCAL")
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  if (pending) return null
  if (!isAuthenticated) {
    return (
      <button type="button" className="acct" onClick={onLogin}>
        로그인
      </button>
    )
  }

  const name = nickname ? `${nickname}님` : "내 계정"
  const logout = async () => {
    setOpen(false)
    await authApi.logout()
    toast({ title: "로그아웃했어요", description: "북마크는 다시 로그인하면 볼 수 있어요." })
  }

  return (
    <div className="acct-wrap" ref={wrapRef}>
      <button
        type="button"
        className="acct on"
        aria-haspopup="menu"
        aria-expanded={open}
        title="로그인되어 있어요"
        onClick={() => setOpen((value) => !value)}
      >
        <PersonIcon />
        <span>{name}</span>
      </button>
      {open ? (
        <div className="acct-menu" role="menu">
          <p>{nickname ? `${nickname}님으로 로그인되어 있어요` : "로그인되어 있어요"}</p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onEditNickname()
            }}
          >
            닉네임 바꾸기
          </button>
          {isLocal ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onChangePassword()
              }}
            >
              비밀번호 바꾸기
            </button>
          ) : null}
          <button type="button" role="menuitem" onClick={() => void logout()}>
            로그아웃
          </button>
          <button
            type="button"
            role="menuitem"
            className="quiet"
            onClick={() => {
              setOpen(false)
              onWithdraw()
            }}
          >
            탈퇴하기
          </button>
        </div>
      ) : null}
    </div>
  )
}
