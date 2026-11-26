"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { buildNightView, emptyMessage, type EmptyKind } from "@/lib/tonight/facts"
import { clearRuns } from "@/lib/tonight/hours"
import { CLOUDY_NIGHT_PHOTO } from "@/lib/tonight/photos"
import { placeKey } from "@/lib/tonight/place"
import { daysBetween, nightName, windowText } from "@/lib/tonight/time"
import type { Coordinates } from "@/lib/tonight/settings"
import type { NightPlace, NightQuery, NightRecommendation } from "@/lib/tonight/types"
import { useNextGoodNight } from "@/lib/tonight/use-next-good-night"
import { FacilityList } from "./facility-list"
import { ForecastCredit } from "./forecast-credit"
import { HeroCard } from "./hero-card"
import { PlaceRow } from "./place-row"
import { Rating } from "./rating"

/** 목록이 카드 아래에 놓이는 화면에서 처음에 보여주는 후보 수. 나머지는 "더 보기"로 편다. */
const SHORT_LIST = 4

/** 장소 카드에 붙이는 버튼과 펼침 내용 */
export interface CardExtras {
  save?: ReactNode
}

interface NightCardProps {
  night: NightRecommendation
  /** 오늘 밤의 날짜. 밤의 이름("내일 밤", "목요일 밤")을 붙일 때 기준이 된다 */
  tonightDate: string
  /** 이 밤 뒤로 고를 수 있는 날짜들 */
  laterDates: readonly string[]
  query: NightQuery
  /** 목록이나 지도에서 고른 장소. 없으면 그 밤에 가장 좋은 곳을 보여준다 */
  selected: NightPlace | null
  onSelectDate: (date: string) => void
  extras?: (place: NightPlace) => CardExtras
}

/**
 * 그 밤의 장소 하나를 크게 보여주는 카드. 처음에는 가장 좋은 곳이고, 목록이나 지도에서 다른 곳을 고르면 같은 자리에서
 * 그 장소로 바뀐다. 화면을 새로 쌓지 않으므로 돌아가는 버튼이 없고, 1위로 돌아가려면 목록의 첫 줄을 누르면 된다.
 * 가볼 만한 곳이 없는 밤에는 그 사정을 먼저 알리고, 그래도 장소를 고르면 알림을 줄여서 카드 위에 남긴다.
 */
export function NightCard({ night, tonightDate, laterDates, query, selected, onSelectDate, extras }: NightCardProps) {
  const view = buildNightView(night)
  const name = nightName(night.date, tonightDate)
  const place = selected ?? view.top
  const isTop = place !== null && view.top !== null && placeKey(place) === placeKey(view.top)
  const cardExtras: CardExtras = place && extras ? extras(place) : {}
  const runs = place ? clearRuns(place.hours) : []
  const maxTravelHours = night.criteria.maxTravelMinutes ? Math.round(night.criteria.maxTravelMinutes / 60) : null

  return (
    <>
      {view.top ? null : (
        <EmptyNight
          kind={view.empty ?? "CLOUDY"}
          name={name}
          compact={place !== null}
          maxTravelHours={maxTravelHours}
          tonightDate={tonightDate}
          laterDates={laterDates}
          query={query}
          onSelectDate={onSelectDate}
        />
      )}
      {place ? (
        <HeroCard
          key={placeKey(place)}
          place={place}
          eyebrow={isTop ? `${name} 가장 좋은 곳` : name}
          save={cardExtras.save}
          nightLabel={name}
        />
      ) : null}
      {runs.length > 1 ? (
        <p className="calm small">맑은 시간이 여러 번 있어요: {runs.map((run) => windowText(run)).join(", ")}</p>
      ) : null}
    </>
  )
}

interface NightCandidatesProps {
  night: NightRecommendation
  tonightDate: string
  isAuthenticated: boolean
  /** 출발 위치. 모르면 이동 시간이 없고 천문대 목록도 거리순으로 놓지 못한다 */
  origin: Coordinates | null
  /** 카드에 떠 있는 장소의 키 */
  shownKey: string | null
  /** 목록이 카드 옆에 제 칸을 가졌는지. 그러면 접지 않고 모두 보여주고, 고른 줄이 보이게 따라간다 */
  beside: boolean
  onOpenPlace: (place: NightPlace) => void
  onOpenSettings?: () => void
  onOpenOrigin?: () => void
  /** 로그인 창을 연다 */
  onLogin: () => void
  /** 목록 아래에 덧붙이는 내용 */
  footer?: ReactNode
}

/**
 * 그 밤의 후보 목록. 서버가 준 추천 순서 그대로 번호를 붙이고, 카드에 떠 있는 장소의 줄을 표시한다.
 * 줄을 누르면 카드가 그 장소로 바뀔 뿐 목록은 그대로다. 넓은 화면에서는 카드 옆 칸에, 그보다 좁으면 카드 아래에 놓인다.
 */
export function NightCandidates({
  night,
  tonightDate,
  isAuthenticated,
  origin,
  shownKey,
  beside,
  onOpenPlace,
  onOpenSettings,
  onOpenOrigin,
  onLogin,
  footer,
}: NightCandidatesProps) {
  const [showAll, setShowAll] = useState(false)
  const rowsRef = useRef<HTMLDivElement>(null)
  const hasOrigin = origin !== null
  const view = buildNightView(night)
  const name = nightName(night.date, tonightDate)
  // 가볼 만한 곳이 없는 밤에는 쉬어가라는 곳을 목록에서 뺀다
  const list = view.top ? night.places : view.rest
  const ranked = list.map((place, index) => ({ place, rank: index + 1 }))
  const everything = beside || showAll
  const shown = everything
    ? ranked
    : // 접어 둔 목록 밖의 장소를 지도에서 골랐으면 그 줄만 끝에 덧붙인다
      ranked.filter((item) => item.rank <= SHORT_LIST || placeKey(item.place) === shownKey)
  const hidden = ranked.length - shown.length
  const missing = night.candidateCount - night.evaluatedCount
  const maxTravelHours = night.criteria.maxTravelMinutes ? Math.round(night.criteria.maxTravelMinutes / 60) : null

  // 지도에서 고른 장소의 줄이 목록 칸 밖에 있으면 보이는 데까지 옮긴다. 목록이 카드 아래에 있을 때는 하지 않는다.
  // 페이지가 카드에서 목록으로 내려가 버린다
  useEffect(() => {
    if (!beside || shownKey === null) return
    rowsRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" })
  }, [beside, shownKey])

  return (
    <>
      {ranked.length > 0 ? (
        <section className="sec">
          <div className="sec-title stack">
            <h2>{view.top ? `${name} 후보 ${ranked.length}곳` : "그나마 볼 수 있는 곳"}</h2>
          </div>
          <div className="rows" ref={rowsRef}>
            {shown.map(({ place, rank }) => (
              <PlaceRow
                key={placeKey(place)}
                place={place}
                rank={rank}
                selected={placeKey(place) === shownKey}
                onOpen={onOpenPlace}
              />
            ))}
          </div>
          {!beside && ranked.length > SHORT_LIST ? (
            <button type="button" className="showmore" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "접기" : `${hidden}곳 더 보기`}
            </button>
          ) : null}
        </section>
      ) : null}

      {daysBetween(tonightDate, night.date) > 0 ? <p className="calm small">멀리 볼수록 예보가 바뀌기 쉬워요.</p> : null}
      {night.excludedByTravelCount > 0 ? (
        <p className="calm small">
          {maxTravelHours ? `${maxTravelHours}시간을 한참 넘는` : "이동 시간 한도를 넘는"} {night.excludedByTravelCount}곳은
          뺐어요.{" "}
          {onOpenSettings ? (
            <button type="button" className="linkish" onClick={onOpenSettings}>
              이동 시간 바꾸기
            </button>
          ) : null}
        </p>
      ) : null}
      {missing > 0 ? <p className="calm small">{missing}곳은 예보를 받지 못해 빠졌어요.</p> : null}
      {!hasOrigin && onOpenOrigin ? (
        <p className="calm small">
          출발 위치를 정하면 이동 시간도 함께 볼 수 있어요.{" "}
          <button type="button" className="linkish" onClick={onOpenOrigin}>
            출발 위치 정하기
          </button>
        </p>
      ) : null}
      {!isAuthenticated ? (
        <p className="calm small">
          <button type="button" className="linkish" onClick={onLogin}>
            로그인
          </button>
          하면 내가 저장한 장소도 함께 비교해 드려요.
        </p>
      ) : null}
      <FacilityList origin={origin} />
      <ForecastCredit places={night.places} />
      {footer}
    </>
  )
}

interface EmptyNightProps {
  kind: EmptyKind
  name: string
  /** 장소 카드 위에 놓을 때. 사진 없이 한 줄로 줄인다 */
  compact: boolean
  maxTravelHours: number | null
  tonightDate: string
  laterDates: readonly string[]
  query: NightQuery
  onSelectDate: (date: string) => void
}

/** 가볼 만한 곳이 없는 밤. 그 뒤의 날짜에서 가볼 만한 첫 밤을 찾아 알려준다. */
function EmptyNight({ kind, name, compact, maxTravelHours, tonightDate, laterDates, query, onSelectDate }: EmptyNightProps) {
  const lookAhead = kind === "CLOUDY" || kind === "POOR"
  const next = useNextGoodNight(lookAhead, laterDates, query)
  const message = emptyMessage(kind, maxTravelHours)
  const photo = CLOUDY_NIGHT_PHOTO

  let body: ReactNode = null
  if (next.status === "searching") {
    body = <p className="calm">다음 맑은 밤을 찾고 있어요.</p>
  } else if (next.status === "found") {
    body = (
      <>
        <p className="calm">
          <b>{nightName(next.date, tonightDate)}</b>에는 {next.place.name}에서{" "}
          {next.place.bestWindow ? `${windowText(next.place.bestWindow)}에 ` : ""}맑을 예정이에요.
        </p>
        <div className="actions">
          <button type="button" className="btn primary" onClick={() => onSelectDate(next.date)}>
            {nightName(next.date, tonightDate)} 추천 보기
          </button>
        </div>
      </>
    )
  } else if (next.status === "none") {
    body = <p className="calm">앞으로 며칠은 맑은 밤이 보이지 않아요.</p>
  }

  if (compact) {
    return (
      <article className="tonight slim">
        <div className="tonight-body">
          <p className="why" data-level="NO">
            <b>{message.title}</b>
            {message.detail}
          </p>
          {body}
        </div>
      </article>
    )
  }

  return (
    <article className="tonight">
      <div className="sky">
        <img className="photo" src={photo.src} alt={photo.alt} />
        <div className="shade" aria-hidden="true" />
        <a className="photo-credit" href={photo.url} target="_blank" rel="noopener noreferrer" title={photo.credit}>
          사진: {photo.credit}
        </a>
        {/* 아쉬운 곳이라도 있는 밤과 어디도 볼 수 없는 밤은 등급이 다르다. 밤 고르기의 표시와 같은 등급을 적는다 */}
        <Rating level={kind === "POOR" ? "MAYBE" : "NO"} />
        <div className="sky-text">
          <div className="eyebrow">{name}</div>
          <h1>{message.title}</h1>
          <div className="sub">{message.detail}</div>
        </div>
      </div>
      {body ? <div className="tonight-body">{body}</div> : null}
    </article>
  )
}
