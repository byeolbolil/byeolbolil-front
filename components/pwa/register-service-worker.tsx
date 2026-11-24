"use client"

import { useEffect } from "react"

/**
 * 서비스 워커를 등록한다. 개발 서버에서는 등록하지 않는다. 캐시된 빌드 산출물이 고친 코드를 가리면 헷갈리기 때문이다.
 * 캐시 정책은 `public/sw.js`에 있다.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 등록에 실패해도 화면은 그대로 쓸 수 있다
    })
  }, [])
  return null
}
