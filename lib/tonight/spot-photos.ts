/**
 * 명소의 실제 사진. 위키미디어 공용에서 재사용이 허락된 사진을 골라 내려받아 직접 서빙한다
 * (백엔드 저장소 docs/decisions.md "명소 사진"). 고른 목록은 `scripts/spot-photos.json`에 있고,
 * `scripts/fetch_spot_photos.py`가 사진과 아래 데이터를 만든다. 손으로 고치지 않는다.
 *
 * 사진은 그 장소가 어떤 곳인지 알아보게 하려는 것이라 대부분 낮에 찍은 풍경이다. 오늘 밤의 하늘 상태는
 * 사진이 아니라 등급, 밤 띠, 구름과 달 설명이 알려 준다.
 */
import data from "./spot-photos.json"
import type { NightPlace } from "./types"

export interface SpotPhoto {
  src: string
  alt: string
  /** 화면에 적는 작가와 라이선스 */
  credit: string
  /** 원본 페이지 */
  url: string
}

const PHOTOS: Readonly<Record<string, SpotPhoto>> = data

/** 장소의 사진. 명소가 아니거나 고른 사진이 없으면 null이다. 명소를 저장한 내 장소도 같은 사진을 쓴다 */
export function spotPhoto(place: Pick<NightPlace, "spotId">): SpotPhoto | null {
  if (place.spotId === undefined) return null
  return PHOTOS[String(place.spotId)] ?? null
}
