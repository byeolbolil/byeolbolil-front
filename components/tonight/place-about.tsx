"use client"

import { useState } from "react"
import {
  linkHost,
  MISSING_VIDEO_THUMB_MAX_WIDTH,
  naverSearchUrl,
  pointMapUrl,
  safeLinks,
  safePoints,
  safeVideos,
  searchUrl,
  youtubeSearchUrl,
  type PlaceLink,
  type PlaceVideo,
} from "@/lib/tonight/links"
import { AlertIcon, CarIcon, ClockIcon, ExternalIcon, PinIcon, PlayIcon, SearchIcon } from "./icons"

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
 * 장소 소개. 무엇으로 알려진 곳인지, 어디에 차를 대는지, 그 안에서 어디에 서서 보는지, 가기 전에 알아 둘 것,
 * 그곳에서 찍은 영상, 더 읽을 글을 적는다. 찾아보지 않아도 되게 미리 조사한 내용을 먼저 보여 주고, 검색은
 * 그다음에 둔다. 직접 저장한 내 장소처럼 적어 둔 내용이 없으면 아무것도 그리지 않는다.
 */
export function PlaceAbout({
  name,
  description,
  guide,
  caution,
  links,
  points,
  videos,
  facility = false,
}: PlaceAboutProps) {
  const references = safeLinks(links)
  const spots = safePoints(points)
  const clips = safeVideos(videos)
  if (!description && !guide && !caution && references.length === 0 && spots.length === 0 && clips.length === 0) {
    return null
  }
  return (
    <div className="about">
      {description ? <p className="about-desc">{description}</p> : null}
      {guide || caution ? (
        <ul className="about-list">
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
        </ul>
      ) : null}
      {spots.length > 0 ? (
        <div className="about-points">
          <b>보는 자리 {spots.length}곳</b>
          <ol>
            {spots.map((point) => {
              const map = pointMapUrl(name, point)
              return (
                <li key={point.name}>
                  <PinIcon />
                  <div>
                    <span className="about-point-name">
                      {point.name}
                      {map ? (
                        <a href={map} target="_blank" rel="noopener noreferrer">
                          지도
                        </a>
                      ) : null}
                    </span>
                    <span>{point.access}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}
      {clips.length > 0 ? (
        <div className="about-videos">
          <b>영상으로 미리 보기</b>
          <ul>
            {clips.map((video) => (
              <VideoCard key={video.url} video={video} />
            ))}
          </ul>
          <p className="about-check">다녀온 사람들이 유튜브에 올린 영상이에요. 누르면 유튜브에서 열려요.</p>
        </div>
      ) : null}
      <div className="about-more">
        <b>더 알아보기</b>
        {facility ? null : (
          <p className="about-check">길과 시설은 바뀔 수 있어요. 가기 전에 최근 후기로 자리와 주차를 한 번 더 확인하세요.</p>
        )}
        <ul>
          {references.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <LinkThumb link={link} />
                <span className="about-link-text">
                  <span className="about-link-title">{link.title}</span>
                  <span className="about-link-host">{linkHost(link.url)}</span>
                </span>
              </a>
            </li>
          ))}
          <li>
            <a href={naverSearchUrl(name, facility)} target="_blank" rel="noopener noreferrer" data-kind="search">
              <SearchIcon />
              <span className="about-link-title">{facility ? "네이버에서 찾아보기" : "네이버에서 후기 찾아보기"}</span>
            </a>
          </li>
          <li>
            <a href={searchUrl(name, facility)} target="_blank" rel="noopener noreferrer" data-kind="search">
              <SearchIcon />
              <span className="about-link-title">{facility ? "구글에서 찾아보기" : "구글에서 후기 찾아보기"}</span>
            </a>
          </li>
          {facility ? null : (
            <li>
              <a href={youtubeSearchUrl(name)} target="_blank" rel="noopener noreferrer" data-kind="search">
                <SearchIcon />
                <span className="about-link-title">유튜브에서 영상 찾아보기</span>
              </a>
            </li>
          )}
        </ul>
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
 * 링크의 미리보기. 그 글이 대표 이미지로 내건 것을 남의 서버에서 바로 부른다. 어디서 불렀는지 알리지 않고
 * 부르고, 받지 못하면 바깥 링크 아이콘으로 바꾼다.
 */
function LinkThumb({ link }: { link: PlaceLink }) {
  const [failed, setFailed] = useState(false)
  if (!link.imageUrl || failed) {
    return (
      <span className="about-thumb" data-empty="true">
        <ExternalIcon />
      </span>
    )
  }
  return (
    <span className="about-thumb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={link.imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </span>
  )
}
