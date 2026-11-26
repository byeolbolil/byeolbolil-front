"use client"

import { useState, type ReactNode } from "react"
import { cloudFact, levelReason, moonFact, skyFact } from "@/lib/tonight/facts"
import { directionsUrl, joinParts, regionOf, travelText } from "@/lib/tonight/place"
import { spotPhoto } from "@/lib/tonight/spot-photos"
import { windowText } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { levelText } from "@/lib/tonight/wording"
import { average, windowHours } from "@/lib/tonight/hours"
import { CloudSky, HumidityDrop, MoonPhase, ScoreRing } from "./gauges"
import { MoonIcon, PinIcon, SkyIcon } from "./icons"
import { NightBand } from "./night-band"
import { PlaceAbout } from "./place-about"
import { Rating } from "./rating"
import { SkyArt } from "./sky-art"

interface HeroCardProps {
  place: NightPlace
  /** 이름 위에 작게 적는 말. "오늘 밤 가장 좋은 곳" 같은 것 */
  eyebrow: string
  /** 저장 버튼. 사진을 가리지 않게 사진 바로 아래, 등급을 설명하는 줄의 오른쪽에 둔다 */
  save?: ReactNode
  /** "이번 주" 탭의 내용. 없으면 탭을 두지 않는다 */
  week?: ReactNode
}

type CardTab = "tonight" | "place" | "week"

/**
 * 장소 하나의 오늘 밤. 사진과 이름, 등급과 그 이유는 늘 보이고, 그 아래를 탭 셋으로 나눈다.
 * 오늘 밤 탭은 볼 시간과 밤 띠, 점수와 구름, 달, 하늘이고, 장소 탭은 그곳이 어떤 곳인지, 이번 주 탭은 일주일의 밤이다.
 * 한 화면에 모두 이어 두면 모바일에서 너무 길어서 나눴다.
 * 명소는 이름 아래에 실제로 차를 대고 보는 지점을 적는다. "합천 황매산"만으로는 어디로 가야 할지 알 수 없다.
 * 사진을 구하지 못한 장소는 다른 곳의 사진을 빌려 쓰지 않고, 오늘 밤 조건으로 그린 하늘 그림을 보여준다.
 */
export function HeroCard({ place, eyebrow, save, week }: HeroCardProps) {
  const [scrubbed, setScrubbed] = useState<number | null>(null)
  const [tab, setTab] = useState<CardTab>("tonight")
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
  const score = average(basis, (hour) => hour.score)
  const humidity = average(basis, (hour) => hour.relativeHumidity)
  const hasAbout = Boolean(
    place.description || place.guide || place.caution || place.links?.length || place.points?.length || place.videos?.length,
  )
  const tabs: Array<{ value: CardTab; label: string }> = [
    { value: "tonight", label: "오늘 밤" },
    ...(hasAbout ? [{ value: "place" as const, label: "장소" }] : []),
    ...(week ? [{ value: "week" as const, label: "이번 주" }] : []),
  ]

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
        <div className="why-row">
          <p className="why" data-level={place.level}>
            <b>{levelText(place.level)}</b>
            {levelReason(place)}
          </p>
          {save}
        </div>
        {tabs.length > 1 ? (
          <div className="card-tabs" role="tablist" aria-label="장소 카드">
            {tabs.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={tab === option.value}
                onClick={() => setTab(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        {tab === "tonight" ? (
          <>
            {place.bestWindow ? (
              <div className="time-row">
                <div>
                  <div className="label">이 시간에 보세요</div>
                  <div className="bigtime">{windowText(place.bestWindow)}</div>
                </div>
                <div className="hours">{place.bestWindow.hours}시간 동안 맑아요</div>
              </div>
            ) : null}
            <NightBand place={place} showScore onScrub={setScrubbed} />
            <ul className="quick">
              <li>
                <ScoreRing score={score} />
                <div>
                  <b>{score === null ? "점수 없음" : `${score}점`}</b>
                  <span>관측 점수</span>
                </div>
              </li>
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
              {place.notes.includes("DEW") ? (
                <li>
                  <HumidityDrop humidity={humidity} />
                  <div>
                    <b>이슬 주의</b>
                    <span>{humidity === null ? "습도가 높아요" : `습도 ${humidity}%`}</span>
                  </div>
                </li>
              ) : null}
            </ul>
            <div className="actions">
              <a className="btn primary" href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">
                길찾기
              </a>
            </div>
          </>
        ) : null}
        {tab === "place" ? (
          <PlaceAbout
            name={place.name}
            description={place.description}
            guide={place.guide}
            caution={place.caution}
            links={place.links}
            points={place.points}
            videos={place.videos}
          />
        ) : null}
        {tab === "week" ? week : null}
      </div>
    </article>
  )
}
