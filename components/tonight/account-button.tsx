"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/api/authApi"
import { authStore } from "@/lib/store/authStore"
import { PersonIcon } from "./icons"

interface AccountButtonProps {
  /** 저장된 로그인을 확인하는 중인지. 그동안은 아무것도 보이지 않는다. "로그인"이 잠깐 떴다 사라지지 않게 하려는 것이다 */
  pending: boolean
}

/**
 * 머리의 로그인 상태. 로그인하지 않았으면 "로그인", 했으면 닉네임을 보여주고 누르면 로그아웃이 나온다.
 * 지금 로그인돼 있는지를 어느 화면에서나 알 수 있게 하는 자리다.
 */
export function AccountButton({ pending }: AccountButtonProps) {
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const nickname = authStore((state) => state.user?.nickname)
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
      <Link className="acct" href="/login">
        로그인
      </Link>
    )
  }

  const name = nickname ? `${nickname}님` : "내 계정"
  const logout = async () => {
    setOpen(false)
    await authApi.logout()
    toast({ title: "로그아웃했어요", description: "내 장소는 다시 로그인하면 볼 수 있어요." })
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
          <button type="button" role="menuitem" onClick={() => void logout()}>
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  )
}
