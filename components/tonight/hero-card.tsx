"use client"

import { useState, type ReactNode } from "react"
import { cloudFact, moonFact, skyFact, skyPhotoKind, tipText } from "@/lib/tonight/facts"
import { SKY_PHOTOS } from "@/lib/tonight/photos"
import { directionsUrl, joinParts, regionOf, travelText } from "@/lib/tonight/place"
import { windowText } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { CloudIcon, MoonIcon, SkyIcon } from "./icons"
import { NightBand } from "./night-band"
import { Rating } from "./rating"

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

/** 장소 하나의 오늘 밤. 하늘 사진, 추천 시간대, 밤 띠, 짧은 설명 세 가지를 담는다. */
export function HeroCard({ place, eyebrow, detailed, actions, children }: HeroCardProps) {
  const [scrubbed, setScrubbed] = useState<number | null>(null)
  const photoKind = skyPhotoKind(place)
  const photo = SKY_PHOTOS[photoKind]
  const scrubbedHour = scrubbed === null ? undefined : place.hours[scrubbed]
  // 흐린 밤 사진은 이미 구름이라 덮지 않는다
  const veil = scrubbedHour && photoKind !== "cloudy" ? scrubbedHour.cloudCover / 100 : 0
  const moon = moonFact(place)
  const cloud = cloudFact(place)
  const sky = skyFact(place)

  return (
    <article className="tonight">
      <div className="sky">
        {/* 정적 자산을 그대로 보여준다. next/image 최적화는 꺼져 있다(next.config.mjs) */}
        <img className="photo" src={photo.src} alt={photo.alt} />
        <div className="veil" style={{ opacity: veil }} aria-hidden="true" />
        <div className="shade" aria-hidden="true" />
        <a className="photo-credit" href={photo.url} target="_blank" rel="noopener noreferrer" title={photo.credit}>
          사진: {photo.credit}
        </a>
        <Rating level={place.level} />
        <div className="sky-text">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{place.name}</h1>
          <div className="sub">
            {joinParts([regionOf(place.address), travelText(place.travel), place.type === "BOOKMARK" && "내 장소"])}
          </div>
        </div>
      </div>
      <div className="tonight-body">
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
            <CloudIcon />
            <div>
              <b>{cloud.title}</b>
              <span>{cloud.detail}</span>
            </div>
          </li>
          {moon ? (
            <li>
              <MoonIcon />
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
