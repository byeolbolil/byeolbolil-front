import type { MetadataRoute } from "next"

/** 홈 화면에 설치할 때 쓰는 웹 앱 매니페스트. 색은 다크 단일 테마의 바탕색이다. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "별볼일",
    short_name: "별볼일",
    description: "오늘 밤 별 보기 좋은 곳과 시간을 알려드려요",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#030511",
    theme_color: "#030511",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
