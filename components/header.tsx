"use client"

import { CheckCircle2, LogIn, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { authStore } from "@/lib/store/authStore"
import { authApi } from "@/lib/api/authApi"

/** 로그인과 촬영 가이드 화면의 머리. 메인 화면은 자체 머리(`components/tonight/tonight-app.tsx`)를 쓴다. */
export function Header() {
  const router = useRouter()
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const user = authStore((state) => state.user)
  const { toast } = useToast()

  const handleLogout = async () => {
    await authApi.logout()
    toast({
      title: "로그아웃 완료",
      description: "정상적으로 로그아웃되었습니다.",
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    })
    router.push("/")
  }

  return (
    <header className="border-b border-border">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-[22px] font-bold tracking-tight hover:opacity-80">
          <svg viewBox="-10 -10 20 20" className="h-5 w-5" aria-hidden="true">
            <path d="M0,-9 L2.2,-2.2 L9,0 L2.2,2.2 L0,9 L-2.2,2.2 L-9,0 L-2.2,-2.2 Z" fill="var(--star)" />
          </svg>
          별볼일
        </Link>
        {isAuthenticated && user?.nickname ? (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{user.nickname}님</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="cursor-pointer gap-2">
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => router.push("/login")} className="cursor-pointer gap-2">
            <LogIn className="h-4 w-4" />
            로그인
          </Button>
        )}
      </div>
    </header>
  )
}
