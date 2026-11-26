"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import {
  googleShortVideoUrl,
  linkHost,
  MISSING_VIDEO_THUMB_MAX_WIDTH,
  naverClipUrl,
  naverSearchUrl,
  pointMapUrl,
  safeLinks,
  safePoints,
  safeVideos,
  searchUrl,
  youtubeSearchUrl,
  type PlaceVideo,
} from "@/lib/tonight/links"
import { AlertIcon, CarIcon, ChevronIcon, ClockIcon, ExternalIcon, PinIcon, PlayIcon } from "./icons"

interface PlaceAboutProps {
  /** 장소 이름. 검색 링크를 만드는 데 쓴다 */
  name: string
  /** 어떤 곳인지 한두 문장 */
  description?: string
  /** 가는 법과 주차. 시설이면 운영 시간과 예약 방법 */
  guide?: string
  /** 계절 폐쇄, 조명, 통제 같은 주의 사항 */
  caution?: string
  /** 가는 길과 서는 자리를 더 자세히 적은 글. 응답에서 온 값을 그대로 넘긴다 */
  links?: unknown
  /** 이 명소 안에서 서서 보는 자리들. 응답에서 온 값을 그대로 넘긴다 */
  points?: unknown
  /** 이 명소에서 별을 본 유튜브 영상. 응답에서 온 값을 그대로 넘긴다 */
  videos?: unknown
  /** 시설이면 안내 줄이 가는 법이 아니라 운영 시간과 예약 방법이다 */
  facility?: boolean
}

/**
 * 장소 소개. 세 덩어리로 나눈다. 가기 전에 알 것(가는 법, 주의 사항, 그 안에서 서서 보는 자리)을 한 판에 모으고,
 * 그곳에서 찍은 영상을 보여 주고, 마지막에 더 읽을 글과 검색을 둔다. 찾아보지 않아도 되게 미리 조사한 내용이 먼저다.
 * 직접 저장한 내 장소처럼 적어 둔 내용이 없으면 아무것도 그리지 않는다.
 */
export function PlaceAbout({ name, description, guide, caution, links, points, videos, facility = false }: PlaceAboutProps) {
  const references = safeLinks(links)
  const spots = safePoints(points)
  const clips = safeVideos(videos)
  // 직접 저장한 내 장소에는 적어 둔 것이 없다. 검색만 덩그러니 보이지 않게 통째로 그리지 않는다
  if (!description && !guide && !caution && references.length === 0 && spots.length === 0 && clips.length === 0) {
    return null
  }
  return (
    <div className="about">
      {description ? <p className="about-desc">{description}</p> : null}
      {guide || caution || spots.length > 0 ? (
        <ul className="about-facts">
          {guide ? (
            <li>
              {facility ? <ClockIcon /> : <CarIcon />}
              <div>
                <b>{facility ? "이용 안내" : "가는 법"}</b>
                <span>{guide}</span>
              </div>
            </li>
          ) : null}
          {caution ? (
            <li data-kind="caution">
              <AlertIcon />
              <div>
                <b>미리 알아두세요</b>
                <span>{caution}</span>
              </div>
            </li>
          ) : null}
          {spots.length > 0 ? (
            <li>
              <PinIcon />
              <div>
                <b>보는 자리 {spots.length}곳</b>
                <ol className="about-points">
                  {spots.map((point) => {
                    const map = pointMapUrl(name, point)
                    return (
                      <li key={point.name}>
                        <span className="about-point-name">
                          {point.name}
                          {map ? (
                            <a href={map} target="_blank" rel="noopener noreferrer">
                              지도
                            </a>
                          ) : null}
                        </span>
                        <span>{point.access}</span>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </li>
          ) : null}
        </ul>
      ) : null}
      {!facility && clips.length > 0 ? (
        <div className="about-section about-videos">
          <b className="about-h">영상으로 미리 보기</b>
          <VideoRow>
            {clips.map((video) => (
              <VideoCard key={video.url} video={video} />
            ))}
          </VideoRow>
        </div>
      ) : null}
      <div className="about-section about-more">
        <b className="about-h">더 찾아보기</b>
        {references.length > 0 ? (
          <ul className="about-links">
            {references.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <span className="about-link-text">
                    <span className="about-link-title">{link.title}</span>
                    <span className="about-link-host">{linkHost(link.url)}</span>
                  </span>
                  <ExternalIcon />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {facility ? null : (
          <p className="about-check">길과 시설은 바뀔 수 있어요. 가기 전에 최근 후기로 자리와 주차를 한 번 더 확인하세요.</p>
        )}
        {/* 검색은 한곳에 모은다. 우리 화면에 싣지 못하는 인스타그램 릴스와 네이버 클립은 짧은 영상 검색으로 본다 */}
        <dl className="about-search">
          <div>
            <dt>{facility ? "검색" : "후기"}</dt>
            <dd>
              <a href={naverSearchUrl(name, facility)} target="_blank" rel="noopener noreferrer">
                네이버
              </a>
              <a href={searchUrl(name, facility)} target="_blank" rel="noopener noreferrer">
                구글
              </a>
            </dd>
          </div>
          {facility ? null : (
            <div>
              <dt>짧은 영상</dt>
              <dd>
                <a href={googleShortVideoUrl(name)} target="_blank" rel="noopener noreferrer">
                  구글
                </a>
                <a href={naverClipUrl(name)} target="_blank" rel="noopener noreferrer">
                  네이버 클립
                </a>
                <a href={youtubeSearchUrl(name)} target="_blank" rel="noopener noreferrer">
                  유튜브
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}

/**
 * 영상 하나의 미리보기. 그림과 제목, 채널 이름만 보여 주고 누르면 유튜브에서 연다. 그림은 유튜브의 서버에서
 * 바로 부른다. 영상이 지워지면 유튜브가 작은 빈 그림을 주므로, 그때는 카드를 그리지 않는다.
 */
function VideoCard({ video }: { video: PlaceVideo }) {
  const [gone, setGone] = useState(false)
  if (gone) return null
  return (
    <li>
      <a href={video.url} target="_blank" rel="noopener noreferrer">
        <span className="about-video-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnailUrl}
            alt=""
            width={320}
            height={180}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth <= MISSING_VIDEO_THUMB_MAX_WIDTH) setGone(true)
            }}
            onError={() => setGone(true)}
          />
          <PlayIcon />
          {video.shortForm ? <em>쇼츠</em> : null}
        </span>
        <span className="about-video-title">{video.title}</span>
        {video.channel ? <span className="about-video-channel">{video.channel}</span> : null}
      </a>
    </li>
  )
}

/**
 * 옆으로 넘기는 영상 줄. 손가락으로는 밀어서 넘기고, 마우스로는 양옆의 화살표로 넘긴다. 마우스 휠은 페이지를 내리는 데
 * 쓰이므로 가로로 바꾸지 않는다.
 */
function VideoRow({ children }: { children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const list = listRef.current
    if (!list) return
    setEdges({ start: list.scrollLeft <= 2, end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 2 })
  }, [])
  useEffect(() => {
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [measure])

  const page = (direction: 1 | -1) => {
    const list = listRef.current
    if (list) list.scrollBy({ left: direction * list.clientWidth * 0.8, behavior: "smooth" })
  }

  return (
    <div className="video-row">
      <ul ref={listRef} onScroll={measure}>
        {children}
      </ul>
      {edges.start ? null : (
        <button type="button" className="video-arrow prev" aria-label="앞 영상" onClick={() => page(-1)}>
          <ChevronIcon />
        </button>
      )}
      {edges.end ? null : (
        <button type="button" className="video-arrow next" aria-label="다음 영상" onClick={() => page(1)}>
          <ChevronIcon />
        </button>
      )}
    </div>
  )
}
