"use client"

import { useState, type ReactNode } from "react"
import { cloudFact, levelReason, moonFact, skyFact, tipText } from "@/lib/tonight/facts"
import { directionsUrl, joinParts, regionOf, travelText } from "@/lib/tonight/place"
import { spotPhoto } from "@/lib/tonight/spot-photos"
import { windowText } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { levelText } from "@/lib/tonight/wording"
import { windowHours } from "@/lib/tonight/hours"
import { CloudSky, MoonPhase } from "./gauges"
import { MoonIcon, PinIcon, SkyIcon } from "./icons"
import { NightBand } from "./night-band"
import { PlaceAbout } from "./place-about"
import { Rating } from "./rating"
import { SkyArt } from "./sky-art"

interface HeroCardProps {
  place: NightPlace
  /** 이름 위에 작게 적는 말. "오늘 밤 가장 좋은 곳" 같은 것 */
  eyebrow: string
  /** 자세히 보기 설정. 밤 띠를 훑을 때 점수도 보여준다 */
  detailed: boolean
  /** 길찾기 옆에 놓는 버튼들 */
  actions?: ReactNode
  /** 카드 아래에 펼치는 내용 */
  children?: ReactNode
}

/**
 * 장소 하나의 오늘 밤. 장소의 사진, 추천 시간대, 밤 띠, 짧은 설명 세 가지와 그곳이 어떤 곳인지를 담는다.
 * 명소는 이름 아래에 실제로 차를 대고 보는 지점을 적는다. "합천 황매산"만으로는 어디로 가야 할지 알 수 없다.
 * 사진을 구하지 못한 장소는 다른 곳의 사진을 빌려 쓰지 않고, 오늘 밤 조건으로 그린 하늘 그림을 보여준다.
 */
export function HeroCard({ place, eyebrow, detailed, actions, children }: HeroCardProps) {
  const [scrubbed, setScrubbed] = useState<number | null>(null)
  const photo = spotPhoto(place)
  const scrubbedHour = scrubbed === null ? undefined : place.hours[scrubbed]
  // 밤 띠를 훑으면 그 시각의 구름량만큼 사진을 덮는다. 그림은 스스로 그 시각의 하늘을 그린다
  const veil = scrubbedHour ? scrubbedHour.cloudCover / 100 : 0
  const moon = moonFact(place)
  const cloud = cloudFact(place)
  const sky = skyFact(place)
  // 요약 옆의 작은 그림에 쓰는 값. 추천 시간이 없으면 어두운 시간 전체로 본다
  const inWindow = windowHours(place.hours, place.bestWindow)
  const basis = inWindow.length > 0 ? inWindow : place.hours.filter((hour) => hour.dark)
  const cloudCover = basis.length > 0 ? Math.round(basis.reduce((sum, hour) => sum + hour.cloudCover, 0) / basis.length) : null
  const moonUp = basis.some((hour) => hour.moonUp)

  return (
    <article className="tonight">
      <div className="sky">
        {photo ? (
          <>
            {/* 정적 자산을 그대로 보여준다. next/image 최적화는 꺼져 있다(next.config.mjs) */}
            <img className="photo" src={photo.src} alt={photo.alt} loading="lazy" />
            <div className="veil" style={{ opacity: veil }} aria-hidden="true" />
          </>
        ) : (
          <SkyArt place={place} hour={scrubbedHour} />
        )}
        <div className="shade" aria-hidden="true" />
        {photo ? (
          <a className="photo-credit" href={photo.url} target="_blank" rel="noopener noreferrer" title={photo.credit}>
            사진: {photo.credit}
          </a>
        ) : null}
        <Rating level={place.level} />
        <div className="sky-text">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{place.name}</h1>
          {place.viewpoint ? (
            <div className="spot">
              <PinIcon />
              {place.viewpoint}
            </div>
          ) : null}
          <div className="sub">
            {joinParts([regionOf(place.address), travelText(place.travel), place.type === "BOOKMARK" && "내 장소"])}
          </div>
        </div>
      </div>
      <div className="tonight-body">
        <p className="why" data-level={place.level}>
          <b>{levelText(place.level)}</b>
          {levelReason(place)}
        </p>
        {place.bestWindow ? (
          <div className="time-row">
            <div>
              <div className="label">이 시간에 보세요</div>
              <div className="bigtime">{windowText(place.bestWindow)}</div>
            </div>
            <div className="hours">{place.bestWindow.hours}시간 동안 맑아요</div>
          </div>
        ) : null}
        <NightBand place={place} showScore={detailed} onScrub={setScrubbed} />
        <ul className="quick">
          <li>
            <CloudSky cloudCover={cloudCover} />
            <div>
              <b>{cloud.title}</b>
              <span>{cloud.detail}</span>
            </div>
          </li>
          {moon ? (
            <li>
              {place.moon ? <MoonPhase moon={place.moon} brightness={place.moonBrightness} up={moonUp} /> : <MoonIcon />}
              <div>
                <b>{moon.title}</b>
                <span>{moon.detail}</span>
              </div>
            </li>
          ) : null}
          <li>
            <SkyIcon />
            <div>
              <b>{sky.title}</b>
              <span>{sky.detail}</span>
            </div>
          </li>
        </ul>
        <p className="tip">{tipText(place)}</p>
        <PlaceAbout description={place.description} guide={place.guide} caution={place.caution} />
        <div className="actions">
          <a className="btn primary" href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">
            길찾기
          </a>
          {actions}
        </div>
        {children}
      </div>
    </article>
  )
}
