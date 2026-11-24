"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/api/auth"
import { bookmarksApi } from "@/lib/api/bookmarks"
import { authStore } from "@/lib/store/authStore"
import { bookmarkStore } from "@/lib/store/bookmarkStore"
import { placeKey } from "@/lib/tonight/place"
import type { NightPlace, NightRecommendation } from "@/lib/tonight/types"
import { PlaceRow } from "./place-row"

interface MyPlacesProps {
  /** 지금 보고 있는 밤의 추천. 내 장소는 로그인했을 때만 들어 있다 */
  night: NightRecommendation | null
  nightName: string
  detailed: boolean
  onOpenPlace: (place: NightPlace) => void
  /** 지도에서 위치를 골라 추가하러 간다 */
  onAddFromMap: () => void
  /** 저장한 장소가 바뀌어 추천을 다시 받아야 할 때 */
  onChanged: () => void
}

/**
 * 내 장소. 저장한 장소(북마크)를 오늘 밤 평가와 함께 보여준다.
 * 인증과 북마크 API는 기존 클라이언트(`lib/api`)를 그대로 쓴다.
 */
export function MyPlaces({ night, nightName, detailed, onOpenPlace, onAddFromMap, onChanged }: MyPlacesProps) {
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const nickname = authStore((state) => state.user?.nickname)
  const bookmarks = bookmarkStore((state) => state.bookmarks)
  const [loadFailed, setLoadFailed] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    setLoadFailed(false)
    bookmarksApi
      .getBookmarkList()
      .then((list) => {
        if (!cancelled) bookmarkStore.getState().setBookmarks(list)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <>
        <p className="calm">자주 가는 곳을 저장하면 매일 밤 추천 명소와 함께 비교해 드려요.</p>
        <div className="actions">
          <Link className="btn primary" href="/login">
            로그인
          </Link>
        </div>
      </>
    )
  }

  const evaluated = night ? night.places.filter((place) => place.type === "BOOKMARK") : []
  const evaluatedIds = new Set(evaluated.map((place) => place.id))

  const remove = async (bookmarkId: number, name: string) => {
    setRemoving(bookmarkId)
    try {
      await bookmarksApi.deleteBookmark(bookmarkId)
      bookmarkStore.getState().removeBookmark(bookmarkId)
      toast({ title: "내 장소에서 지웠어요", description: name })
      onChanged()
    } catch {
      toast({ title: "지우지 못했어요", description: "잠시 뒤에 다시 시도해 주세요.", variant: "destructive" })
    } finally {
      setRemoving(null)
    }
  }

  return (
    <>
      <section className="sec">
        <div className="sec-title">
          <h2>내 장소</h2>
          <p>{nightName} 기준</p>
        </div>
        {evaluated.length > 0 ? (
          <div className="rows">
            {evaluated.map((place) => (
              <PlaceRow key={placeKey(place)} place={place} detailed={detailed} onOpen={onOpenPlace} />
            ))}
          </div>
        ) : (
          <p className="calm small">
            {bookmarks.length > 0
              ? "저장한 장소가 이번 추천에 들어 있지 않아요. 이동 시간 한도보다 멀거나 예보를 받지 못한 경우예요."
              : "아직 저장한 장소가 없어요. 추천 카드의 저장 버튼을 누르거나 지도에서 위치를 골라 추가해 보세요."}
          </p>
        )}
      </section>

      {loadFailed ? <p className="calm small">저장한 장소 목록을 불러오지 못했어요.</p> : null}
      {bookmarks.length > 0 ? (
        <section className="sec">
          <div className="sec-title">
            <h2>저장한 장소</h2>
            <p>{bookmarks.length}곳</p>
          </div>
          <ul className="saved">
            {bookmarks.map((bookmark) =>
              bookmark.bookmarkId === undefined ? null : (
                <li key={bookmark.bookmarkId}>
                  <div>
                    <b>{bookmark.name}</b>
                    {night && !evaluatedIds.has(bookmark.bookmarkId) ? <span>이번 추천에서 빠졌어요</span> : null}
                  </div>
                  <button
                    type="button"
                    className="linkish"
                    disabled={removing === bookmark.bookmarkId}
                    onClick={() => void remove(bookmark.bookmarkId as number, bookmark.name ?? "")}
                  >
                    지우기
                  </button>
                </li>
              ),
            )}
          </ul>
        </section>
      ) : null}

      <div className="actions">
        <button type="button" className="btn" onClick={onAddFromMap}>
          지도에서 장소 추가
        </button>
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={() => void authApi.logout()}>
          {nickname ? `${nickname}님 로그아웃` : "로그아웃"}
        </button>
      </div>
    </>
  )
}
