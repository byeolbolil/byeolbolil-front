/** 화면에 쓰는 작은 그림들. 목업의 SVG를 옮겼다. */

const STROKE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  "aria-hidden": true,
} as const

/** 다섯 꼭짓점 별의 경로. 등급 표시와 지도 표식이 같이 쓴다. */
function starPath(cx: number, cy: number, outer: number, inner: number): string {
  let d = ""
  for (let k = 0; k < 10; k++) {
    const radius = k % 2 ? inner : outer
    const angle = -Math.PI / 2 + (k * Math.PI) / 5
    d += `${k ? "L" : "M"}${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
  }
  return `${d}Z`
}

export const STAR_PATH = starPath(12, 12, 11, 4.6)

export function BrandMark() {
  return (
    <svg viewBox="-10 -10 20 20" aria-hidden="true">
      <path d="M0,-9 L2.2,-2.2 L9,0 L2.2,2.2 L0,9 L-2.2,2.2 L-9,0 L-2.2,-2.2 Z" fill="var(--star)" />
    </svg>
  )
}

export function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR_PATH} fill={filled ? "var(--star)" : "var(--star-dim)"} />
    </svg>
  )
}

export function CloudIcon() {
  return (
    <svg {...STROKE}>
      <path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 7 10.5 3.75 3.75 0 0 0 7 18Z" />
    </svg>
  )
}

export function MoonIcon() {
  return (
    <svg {...STROKE}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  )
}

export function SkyIcon() {
  return (
    <svg {...STROKE}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M12 8.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    </svg>
  )
}

export function ChevronIcon() {
  return (
    <svg {...STROKE} strokeWidth={2}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg {...STROKE} strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function ClockIcon() {
  return (
    <svg {...STROKE} strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function CityIcon() {
  return (
    <svg {...STROKE} strokeLinejoin="round">
      <path d="M4 20V10l5-3v13M9 20V5l6 3v12M15 20v-8l5 2v6M3 20h18" />
    </svg>
  )
}

export function CarIcon() {
  return (
    <svg {...STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 16V12l2-5h10l2 5v4M3.5 16h17M7 16v2M17 16v2M7.5 12.5h.01M16.5 12.5h.01" />
    </svg>
  )
}

export function PinIcon() {
  return (
    <svg {...STROKE} strokeLinejoin="round">
      <path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </svg>
  )
}

export function PersonIcon() {
  return (
    <svg {...STROKE} strokeLinecap="round">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </svg>
  )
}

export function CameraIcon({ className }: { className?: string }) {
  return (
    <svg {...STROKE} strokeLinejoin="round" className={className}>
      <path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg {...STROKE} strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function TonightTabIcon() {
  return (
    <svg className="ico" {...STROKE}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      <path d="M17 3v3M15.5 4.5h3" />
    </svg>
  )
}

export function MapTabIcon() {
  return (
    <svg className="ico" {...STROKE}>
      <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

export function MineTabIcon() {
  return (
    <svg className="ico" {...STROKE}>
      <path d="M6 3h12v18l-6-4-6 4Z" />
    </svg>
  )
}

export function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} {...STROKE} strokeLinecap="round">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  )
}
