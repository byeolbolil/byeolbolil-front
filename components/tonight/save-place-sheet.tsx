"use client"

import { useState, type FormEvent } from "react"
import type { Coordinates } from "@/lib/tonight/settings"
import { Sheet } from "./sheet"

interface SavePlaceSheetProps {
  position: Coordinates
  /** 검색으로 고른 곳이면 그 이름을 미리 넣어 둔다 */
  defaultName?: string
  /** 고른 위치가 어디쯤인지. 모르면 좌표를 보여 준다 */
  area?: string | null
  /** 저장을 시도한다. 성공하면 true */
  onSave: (name: string) => Promise<boolean>
  onClose: () => void
}

/** 지도에서 고른 위치에 이름을 붙여 내 장소로 저장한다. */
export function SavePlaceSheet({ position, defaultName, area, onSave, onClose }: SavePlaceSheetProps) {
  const [name, setName] = useState(defaultName ?? "")
  const [saving, setSaving] = useState(false)
  const trimmed = name.trim()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!trimmed || saving) return
    setSaving(true)
    const saved = await onSave(trimmed)
    setSaving(false)
    if (saved) onClose()
  }

  return (
    <Sheet title="내 장소로 저장" onClose={onClose}>
      <form className="q" onSubmit={submit}>
        <label className="ql" htmlFor="place-name">
          이 장소를 뭐라고 부를까요?
        </label>
        <div className="hint">
          고른 위치: {area ? `${area} (${position.lat.toFixed(4)}, ${position.lon.toFixed(4)})` : `${position.lat.toFixed(4)}, ${position.lon.toFixed(4)}`}
        </div>
        <input
          id="place-name"
          className="text-input"
          value={name}
          maxLength={50}
          placeholder="예: 우리집 옥상"
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
        <div className="actions">
          <button type="submit" className="btn primary" disabled={!trimmed || saving}>
            {saving ? "저장하는 중" : "저장"}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
        </div>
      </form>
    </Sheet>
  )
}
