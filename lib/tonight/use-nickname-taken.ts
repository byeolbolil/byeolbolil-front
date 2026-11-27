"use client"

import { useEffect, useState } from "react"
import { membersApi } from "@/lib/api/members"
import { cleanNickname, nicknameProblem } from "./nickname"

const DELAY_MS = 400

/**
 * 적는 동안 그 닉네임을 다른 회원이 쓰고 있는지 미리 본다. 쓰고 있으면 true, 아니면 false, 모르면 null.
 * 규칙에 어긋나거나 `skip`이면 묻지 않는다. 서버도 저장할 때 다시 보므로 여기서 놓쳐도 409로 막힌다.
 */
export function useNicknameTaken(value: string, skip: boolean): boolean | null {
  const name = cleanNickname(value)
  const ask = !skip && nicknameProblem(value) === null
  const [result, setResult] = useState<{ name: string; taken: boolean } | null>(null)

  useEffect(() => {
    if (!ask) return
    let live = true
    const timer = window.setTimeout(() => {
      membersApi
        .isNicknameAvailable(name)
        .then((available) => {
          if (live) setResult({ name, taken: !available })
        })
        .catch(() => {
          // 미리 보는 것일 뿐이라 실패는 넘긴다
        })
    }, DELAY_MS)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [ask, name])

  return ask && result?.name === name ? result.taken : null
}
