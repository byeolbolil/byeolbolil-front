/**
 * 하늘 사진. 재사용이 허락된 자료만 내려받아 직접 서빙한다(백엔드 저장소 docs/decisions.md 2026-11-24
 * "사진과 지도 데이터는 재사용 허가 자료만 직접 서빙"). CC BY-SA 사진은 크기만 줄였고 자르거나 보정하지 않았다.
 */
export interface SkyPhoto {
  src: string
  alt: string
  /** 화면에 적는 작가와 라이선스 */
  credit: string
  /** 원본 페이지 */
  url: string
}

/** 가볼 만한 곳이 없는 밤의 카드에 쓰는 사진. 장소 카드는 장소의 사진이나 그림을 쓴다(`spot-photos.ts`) */
export const CLOUDY_NIGHT_PHOTO: SkyPhoto = {
  src: "/sky/sky-cloudy.jpg",
  alt: "구름이 덮인 산 위의 밤하늘",
  credit: "BLM Oregon and Washington, 퍼블릭 도메인",
  url: "https://commons.wikimedia.org/wiki/File:Night_Clouds_(11424694453).jpg",
}
