import type { Metadata, Viewport } from "next"
import { Noto_Sans_KR } from "next/font/google"
import type { ReactNode } from "react"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/components/auth/AuthProvider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

// 글꼴은 목업에서 후보를 비교한 뒤 Noto Sans KR로 정했다. 한글은 필요한 글자 묶음만 나눠 받는다.
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-sans-kr",
})

export const metadata: Metadata = {
  title: "별볼일",
  description: "오늘 밤 별 보기 좋은 곳과 시간을 알려드려요",
  applicationName: "별볼일",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#030511",
  colorScheme: "dark",
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
