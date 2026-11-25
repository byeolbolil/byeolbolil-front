"use client"

import { useState } from "react"
import { linkHost, safeLinks, searchUrl, type PlaceLink } from "@/lib/tonight/links"
import { AlertIcon, CarIcon, ClockIcon, ExternalIcon, SearchIcon } from "./icons"

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
  /** 시설이면 안내 줄이 가는 법이 아니라 운영 시간과 예약 방법이다 */
  facility?: boolean
}

/**
 * 장소 소개. 무엇으로 알려진 곳인지, 어디에 차를 대는지, 가기 전에 알아 둘 것, 더 읽을 글을 적는다.
 * 직접 저장한 내 장소처럼 적어 둔 내용이 없으면 아무것도 그리지 않는다.
 */
export function PlaceAbout({ name, description, guide, caution, links, facility = false }: PlaceAboutProps) {
  const references = safeLinks(links)
  if (!description && !guide && !caution && references.length === 0) return null
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
      <div className="about-more">
        <b>더 알아보기</b>
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
            <a href={searchUrl(name, facility)} target="_blank" rel="noopener noreferrer" data-kind="search">
              <SearchIcon />
              <span className="about-link-title">{facility ? "구글에서 찾아보기" : "구글에서 후기 찾아보기"}</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
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
