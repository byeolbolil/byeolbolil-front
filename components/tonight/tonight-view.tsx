"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { buildNightView, emptyMessage, type EmptyKind } from "@/lib/tonight/facts"
import { CLOUDY_NIGHT_PHOTO } from "@/lib/tonight/photos"
import { placeKey } from "@/lib/tonight/place"
import { daysBetween, nightName, windowText } from "@/lib/tonight/time"
import type { NightPlace, NightQuery, NightRecommendation } from "@/lib/tonight/types"
import { useNextGoodNight } from "@/lib/tonight/use-next-good-night"
import { ForecastCredit } from "./forecast-credit"
import { HeroCard } from "./hero-card"
import { PlaceRow } from "./place-row"
import { Rating } from "./rating"

/** 처음에 보여주는 후보 수. 나머지는 "더 보기"로 편다. */
const SHORT_LIST = 3

interface TonightViewProps {
  night: NightRecommendation
  /** 오늘 밤의 날짜. 밤의 이름("내일 밤", "목요일 밤")을 붙일 때 기준이 된다 */
  tonightDate: string
  /** 이 밤 뒤로 고를 수 있는 날짜들 */
  laterDates: readonly string[]
  query: NightQuery
  detailed: boolean
  isAuthenticated: boolean
  hasOrigin: boolean
  onOpenPlace: (place: NightPlace) => void
  onSelectDate: (date: string) => void
  onOpenSettings?: () => void
  /** 가장 좋은 곳 카드에 붙일 버튼과 펼침 내용 */
  heroExtras?: (place: NightPlace) => { actions?: ReactNode; children?: ReactNode }
  /** 목록 아래에 덧붙이는 내용 */
  footer?: ReactNode
}

/** 오늘 밤 추천 화면. 가장 좋은 곳 하나를 크게, 나머지 후보를 짧은 목록으로 보여준다. */
export function TonightView({
  night,
  tonightDate,
  laterDates,
  query,
  detailed,
  isAuthenticated,
  hasOrigin,
  onOpenPlace,
  onSelectDate,
  onOpenSettings,
  heroExtras,
  footer,
}: TonightViewProps) {
  const [showAll, setShowAll] = useState(false)
  const view = buildNightView(night)
  const name = nightName(night.date, tonightDate)
  const shown = showAll ? view.rest : view.rest.slice(0, SHORT_LIST)
  const hidden = view.rest.length - shown.length
  const missing = night.candidateCount - night.evaluatedCount
  const maxTravelHours = night.criteria.maxTravelMinutes ? Math.round(night.criteria.maxTravelMinutes / 60) : null
  const extras = view.top && heroExtras ? heroExtras(view.top) : {}

  return (
    <>
      {view.top ? (
        <HeroCard
          key={placeKey(view.top)}
          place={view.top}
          eyebrow={`${name} 가장 좋은 곳`}
          detailed={detailed}
          actions={extras.actions}
        >
          {extras.children}
        </HeroCard>
      ) : (
        <EmptyNight
          kind={view.empty ?? "CLOUDY"}
          name={name}
          maxTravelHours={maxTravelHours}
          tonightDate={tonightDate}
          laterDates={laterDates}
          query={query}
          onSelectDate={onSelectDate}
        />
      )}

      {view.rest.length > 0 ? (
        <section className="sec">
          <div className="sec-title">
            <h2>{view.top ? "여기도 괜찮아요" : "그나마 볼 수 있는 곳"}</h2>
            <p>{isAuthenticated ? "내 장소와 추천 명소 중에서" : "추천 명소 중에서"}</p>
          </div>
          <div className="rows">
            {shown.map((place) => (
              <PlaceRow key={placeKey(place)} place={place} detailed={detailed} onOpen={onOpenPlace} />
            ))}
          </div>
          {view.rest.length > SHORT_LIST ? (
            <button type="button" className="showmore" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "접기" : `${hidden}곳 더 보기`}
            </button>
          ) : null}
        </section>
      ) : null}

      {daysBetween(tonightDate, night.date) > 0 ? <p className="calm small">멀리 볼수록 예보가 바뀌기 쉬워요.</p> : null}
      {night.excludedByTravelCount > 0 ? (
        <p className="calm small">
          {maxTravelHours ? `${maxTravelHours}시간보다 오래 걸리는` : "이동 시간 한도를 넘는"} {night.excludedByTravelCount}곳은
          뺐어요.{" "}
          {onOpenSettings ? (
            <button type="button" className="linkish" onClick={onOpenSettings}>
              이동 시간 바꾸기
            </button>
          ) : null}
        </p>
      ) : null}
      {missing > 0 ? <p className="calm small">{missing}곳은 예보를 받지 못해 빠졌어요.</p> : null}
      {!hasOrigin && onOpenSettings ? (
        <p className="calm small">
          출발 위치를 정하면 이동 시간도 함께 볼 수 있어요.{" "}
          <button type="button" className="linkish" onClick={onOpenSettings}>
            출발 위치 정하기
          </button>
        </p>
      ) : null}
      {!isAuthenticated ? (
        <p className="calm small">
          <Link href="/login">로그인</Link>하면 내가 저장한 장소도 함께 비교해 드려요.
        </p>
      ) : null}
      <ForecastCredit places={night.places} />
      {footer}
    </>
  )
}

interface EmptyNightProps {
  kind: EmptyKind
  name: string
  maxTravelHours: number | null
  tonightDate: string
  laterDates: readonly string[]
  query: NightQuery
  onSelectDate: (date: string) => void
}

/** 가볼 만한 곳이 없는 밤. 그 뒤의 날짜에서 가볼 만한 첫 밤을 찾아 알려준다. */
function EmptyNight({ kind, name, maxTravelHours, tonightDate, laterDates, query, onSelectDate }: EmptyNightProps) {
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

  return (
    <article className="tonight">
      <div className="sky">
        <img className="photo" src={photo.src} alt={photo.alt} />
        <div className="shade" aria-hidden="true" />
        <a className="photo-credit" href={photo.url} target="_blank" rel="noopener noreferrer" title={photo.credit}>
          사진: {photo.credit}
        </a>
        <Rating level="NO" />
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
