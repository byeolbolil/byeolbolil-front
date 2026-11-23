/**
 * 추천 카드의 하늘 사진. 재사용이 허락된 자료만 내려받아 직접 서빙한다(백엔드 저장소 docs/decisions.md 2026-11-24
 * "사진과 지도 데이터는 재사용 허가 자료만 직접 서빙"). CC BY-SA 사진은 크기만 줄였고 자르거나 보정하지 않았다.
 */
import type { SkyPhotoKind } from "./facts"

export interface SkyPhoto {
  src: string
  alt: string
  /** 화면에 적는 작가와 라이선스 */
  credit: string
  /** 원본 페이지 */
  url: string
}

export const SKY_PHOTOS: Record<SkyPhotoKind, SkyPhoto> = {
  clear: {
    src: "/sky/sky-clear.jpg",
    alt: "강원 태기산 정상의 은하수와 선돌",
    credit: "이원웅(INSOLMAE), CC BY-SA 3.0",
    url: "https://commons.wikimedia.org/wiki/File:%EB%B0%A4%ED%95%98%EB%8A%98%EC%9D%98_%EC%9D%80%ED%95%98%EC%88%98.jpg",
  },
  moon: {
    src: "/sky/sky-moon.jpg",
    alt: "밝은 달이 뜬 덕유산의 밤",
    credit: "Mg shin, CC BY-SA 3.0",
    url: "https://commons.wikimedia.org/wiki/File:%EB%8D%95%EC%9C%A0%EC%82%B0%EC%9D%98_%EB%B0%A4.jpg",
  },
  cloudy: {
    src: "/sky/sky-cloudy.jpg",
    alt: "구름이 덮인 산 위의 밤하늘",
    credit: "BLM Oregon and Washington, 퍼블릭 도메인",
    url: "https://commons.wikimedia.org/wiki/File:Night_Clouds_(11424694453).jpg",
  },
}
