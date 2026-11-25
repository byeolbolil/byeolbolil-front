"use client"

import Link from "next/link"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/api/auth"
import { bookmarksApi } from "@/lib/api/bookmarks"
import { authStore } from "@/lib/store/authStore"
import type { FoundPlace } from "@/lib/tonight/geocode"
import { directionsUrl, joinParts, regionOf } from "@/lib/tonight/place"
import type { NightPlace, NightQuery, NightRecommendation } from "@/lib/tonight/types"
import { useMyWeek } from "@/lib/tonight/use-week"
import { weekSummary, type WeekPlace } from "@/lib/tonight/week"
import { BookmarkIcon, CloseIcon } from "./icons"
import { PlaceSearch } from "./place-search"
import { WeekOutlook } from "./week-outlook"
import { WeekNightPanel, WeekStrip } from "./week-strip"

interface MyPlacesProps {
  /** 지금 보고 있는 밤의 추천. 내 장소는 로그인했을 때만 들어 있다 */
  night: NightRecommendation | null
  /** 맑은 시간 기준과 "몇 시까지". 이번 주 평가에도 같은 기준을 쓴다 */
  criteria: Pick<NightQuery, "minClearHours" | "preferBefore">
  onOpenPlace: (place: NightPlace) => void
  /** 그 날짜의 밤 추천으로 간다 */
  onOpenNight: (date: string) => void
  /** 지도에서 위치를 골라 추가하러 간다 */
  onAddFromMap: () => void
  /** 저장한 장소가 바뀌어 추천을 다시 받아야 할 때 */
  onChanged: () => void
}

/** 저장하는 좌표의 자릿수. 소수 다섯째 자리는 약 1m다 */
const roundPosition = (value: number) => Math.round(value * 1e5) / 1e5

/**
 * 내 장소. 저장한 곳마다 이번 주 일곱 밤을 한 줄로 늘어놓아, 어느 곳이 언제 좋은지 한꺼번에 본다.
 * 위쪽의 찾기는 저장하지 않은 곳의 이번 주도 바로 보여 주고, 마음에 들면 그 자리에서 저장한다.
 */
export function MyPlaces({ night, criteria, onOpenPlace, onOpenNight, onAddFromMap, onChanged }: MyPlacesProps) {
  const isAuthenticated = authStore((state) => state.isAuthenticated)
  const nickname = authStore((state) => state.user?.nickname)
  const [revision, setRevision] = useState(0)
  const mine = useMyWeek(true, criteria, revision)
  const [found, setFound] = useState<FoundPlace | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const changed = () => {
    setRevision((value) => value + 1)
    onChanged()
  }

  const saveFound = async () => {
    if (!found || saving) return
    setSaving(true)
    try {
      await bookmarksApi.addBookmark({
        type: "CUSTOM",
        name: found.name.slice(0, 50),
        address: found.address || found.name,
        latitude: roundPosition(found.lat),
        longitude: roundPosition(found.lon),
      })
      toast({ title: "내 장소에 저장했어요", description: found.name })
      setFound(null)
      changed()
    } catch {
      toast({ title: "저장하지 못했어요", description: "잠시 뒤에 다시 시도해 주세요.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (place: WeekPlace) => {
    if (place.id === undefined) return
    try {
      await bookmarksApi.deleteBookmark(place.id)
      toast({ title: "내 장소에서 지웠어요", description: place.name })
      changed()
    } catch {
      toast({ title: "지우지 못했어요", description: "잠시 뒤에 다시 시도해 주세요.", variant: "destructive" })
    }
  }

  const places = mine.week?.places ?? []
  const tonightPlaces = night ? night.places.filter((place) => place.type === "BOOKMARK") : []

  return (
    <>
      <section className="sec lookup">
        <div className="sec-title">
          <h2>어디든 이번 주 보기</h2>
          <p>장소나 동네 이름으로 찾아요</p>
        </div>
        <PlaceSearch
          className="lookup-search"
          label="이번 주를 볼 장소 찾기"
          placeholder="예: 안반데기, 속초, 우리 동네 이름"
          emptyHint="다른 이름으로 찾아보세요."
          onSelect={setFound}
        />
        {found ? (
          <article className="mycard">
            <header>
              <div>
                <b>{found.name}</b>
                <span>{found.address || "찾은 위치"}</span>
              </div>
              <button type="button" className="x-btn" aria-label="찾은 장소 닫기" onClick={() => setFound(null)}>
                <CloseIcon />
              </button>
            </header>
            <WeekOutlook
              key={`${found.lat},${found.lon}`}
              position={found}
              criteria={criteria}
              nightActions={(date) => (
                <button type="button" className="btn" onClick={() => onOpenNight(date)}>
                  이 밤의 추천 순위 보기
                </button>
              )}
            />
            <div className="actions">
              {isAuthenticated ? (
                <button type="button" className="btn save" disabled={saving} onClick={() => void saveFound()}>
                  <BookmarkIcon filled={false} />
                  {saving ? "저장하는 중" : "내 장소에 저장"}
                </button>
              ) : (
                <Link className="btn save" href="/login">
                  <BookmarkIcon filled={false} />
                  로그인하고 저장
                </Link>
              )}
              <a
                className="btn"
                href={directionsUrl({ name: found.name, latitude: found.lat, longitude: found.lon })}
                target="_blank"
                rel="noopener noreferrer"
              >
                길찾기
              </a>
            </div>
          </article>
        ) : null}
      </section>

      <section className="sec">
        <div className="sec-title">
          <h2>내 장소</h2>
          <p>{isAuthenticated && places.length > 0 ? `${places.length}곳의 이번 주` : "저장한 곳의 이번 주"}</p>
        </div>
        {!isAuthenticated ? (
          <>
            <p className="calm">
              자주 가는 곳을 저장해 두면 곳마다 이번 주 일곱 밤을 한눈에 비교하고, 매일 밤 추천에도 함께 넣어 드려요.
            </p>
            <div className="actions">
              <Link className="btn primary" href="/login">
                로그인
              </Link>
            </div>
          </>
        ) : mine.status === "error" ? (
          <p className="calm small">
            저장한 장소를 불러오지 못했어요.{" "}
            <button type="button" className="linkish" onClick={mine.reload}>
              다시 받기
            </button>
          </p>
        ) : !mine.week ? (
          <div className="week-skeleton tall" aria-busy="true" aria-label="내 장소를 불러오는 중">
            {Array.from({ length: 7 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
        ) : places.length === 0 ? (
          <p className="calm">
            아직 저장한 장소가 없어요. 위에서 장소를 찾아 저장하거나, 추천 카드의 <b>내 장소에 저장</b>을 눌러 보세요.
          </p>
        ) : (
          <div className={`mycards${mine.status === "loading" ? " refreshing" : ""}`}>
            {places.map((place) => (
              <MyPlaceCard
                key={place.id ?? `${place.latitude},${place.longitude}`}
                place={place}
                dates={mine.week?.dates ?? []}
                tonight={mine.week?.startDate ?? ""}
                tonightPlace={tonightPlaces.find((item) => item.id === place.id) ?? null}
                onOpenPlace={onOpenPlace}
                onOpenNight={onOpenNight}
                onRemove={remove}
              />
            ))}
          </div>
        )}
      </section>

      {isAuthenticated ? (
        <div className="actions">
          <button type="button" className="btn" onClick={onAddFromMap}>
            지도에서 장소 추가
          </button>
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={() => void authApi.logout()}>
            {nickname ? `${nickname}님 로그아웃` : "로그아웃"}
          </button>
        </div>
      ) : null}
    </>
  )
}

interface MyPlaceCardProps {
  place: WeekPlace
  dates: readonly string[]
  tonight: string
  /** 오늘 밤 추천에 들어 있으면 그 항목. 이동 시간 한도보다 멀면 없다 */
  tonightPlace: NightPlace | null
  onOpenPlace: (place: NightPlace) => void
  onOpenNight: (date: string) => void
  onRemove: (place: WeekPlace) => Promise<void>
}

/** 저장한 장소 하나의 일주일. 요일 칸을 누르면 그 밤과 할 수 있는 일이 펼쳐진다 */
function MyPlaceCard({ place, dates, tonight, tonightPlace, onOpenPlace, onOpenNight, onRemove }: MyPlaceCardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const night = place.nights.find((item) => item.date === selected) ?? null
  const name = place.name ?? "저장한 장소"

  const remove = async () => {
    setRemoving(true)
    await onRemove(place)
    setRemoving(false)
    setConfirming(false)
  }

  return (
    <article className="mycard">
      <header>
        <div>
          <b>
            <BookmarkIcon filled />
            {name}
          </b>
          <span>{joinParts([regionOf(place.address), weekSummary(place.nights, tonight)])}</span>
        </div>
      </header>
      {place.nights.length > 0 ? (
        <WeekStrip
          dates={dates}
          nights={place.nights}
          tonight={tonight}
          selected={selected}
          onSelect={(date) => setSelected((current) => (current === date ? null : date))}
        />
      ) : null}
      {night ? <WeekNightPanel night={night} tonight={tonight} /> : null}
      <div className="actions">
        {night && night.date !== tonight ? (
          <button type="button" className="btn" onClick={() => onOpenNight(night.date)}>
            이 밤의 추천 순위 보기
          </button>
        ) : tonightPlace ? (
          <button type="button" className="btn" onClick={() => onOpenPlace(tonightPlace)}>
            오늘 밤 자세히
          </button>
        ) : null}
        <a
          className="btn"
          href={directionsUrl({ name, latitude: place.latitude, longitude: place.longitude })}
          target="_blank"
          rel="noopener noreferrer"
        >
          길찾기
        </a>
        <span className="spacer" />
        {confirming ? (
          <>
            <button type="button" className="btn danger" disabled={removing} onClick={() => void remove()}>
              {removing ? "지우는 중" : "지울게요"}
            </button>
            <button type="button" className="btn ghost" onClick={() => setConfirming(false)}>
              취소
            </button>
          </>
        ) : (
          <button type="button" className="btn ghost" onClick={() => setConfirming(true)}>
            지우기
          </button>
        )}
      </div>
    </article>
  )
}
