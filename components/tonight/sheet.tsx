"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { CloseIcon } from "./icons"

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** 아래에서 올라오는 시트(넓은 화면에서는 가운데 창). 바깥을 누르거나 Esc를 누르면 닫힌다. */
export function Sheet({ title, onClose, children }: SheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  // 부모가 다시 그려질 때마다 초점이 닫기 버튼으로 돌아가지 않도록, 닫는 함수는 ref로 들고 effect는 한 번만 돈다
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current()
    }
    document.addEventListener("keydown", onKeyDown)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])

  return (
    <div
      className="sheet-back"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button ref={closeRef} type="button" className="x-btn" aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
