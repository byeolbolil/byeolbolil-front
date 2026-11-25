"use client"

import { useState } from "react"
import { CITIES } from "@/lib/tonight/cities"
import type { FoundPlace } from "@/lib/tonight/geocode"
import { ORIGIN_NAME_MAX, type OriginSetting } from "@/lib/tonight/settings"
import type { GeoStatus } from "@/lib/tonight/use-geo-position"
import { PlaceSearch } from "./place-search"
import { Sheet } from "./sheet"

/** 검색하지 않고 바로 고를 수 있게 내놓는 도시 */
const QUICK_CITIES = ["서울", "부산", "인천", "대구", "대전", "광주", "울산", "강릉", "제주"]
  .map((name) => CITIES.find((city) => city.name === name))
  .filter((city) => city !== undefined)

interface OriginSheetProps {
  origin: OriginSetting
  geoStatus: GeoStatus
  /** 현재 위치가 속한 지역의 이름. 아직 모르면 null */
  gpsArea: string | null
  onChange: (origin: OriginSetting) => void
  onClose: () => void
}

function originHint(origin: OriginSetting, geoStatus: GeoStatus, gpsArea: string | null): string {
  if (origin.kind === "place") return `${origin.name}에서 출발한다고 보고 이동 시간을 어림해요.`
  if (origin.kind === "none") return "출발 위치가 없으면 이동 시간 없이 추천해요."
  switch (geoStatus) {
    case "granted":
      return `이 기기가 지금 있는 곳${gpsArea ? `(${gpsArea} 근처)` : ""}에서 출발한다고 보고 이동 시간을 어림해요.`
    case "denied":
      return "브라우저에서 위치 권한이 꺼져 있어요. 권한을 켜거나 출발 위치를 직접 정해 주세요."
    case "unavailable":
      return "지금은 위치를 알 수 없어요. 출발 위치를 직접 정해 주세요."
    case "asking":
      return "브라우저가 위치를 써도 되는지 묻고 있어요. 허용하면 지금 있는 곳을 출발 위치로 써요."
    default:
      return "위치를 확인하는 중이에요."
  }
}

/**
 * 출발 위치 정하기. 머리의 출발 위치 버튼이 여는 화면이다. 보기 방식이나 시간 같은 나머지 설정은
 * 설정 화면(`settings-sheet.tsx`)에 따로 있다.
 */
export function OriginSheet({ origin, geoStatus, gpsArea, onChange, onClose }: OriginSheetProps) {
  /** "직접 정하기"를 눌러 고르는 중인지. 고르기 전까지는 앞서 정한 출발 위치를 그대로 쓴다 */
  const [choosing, setChoosing] = useState(false)
  const mode = choosing ? "place" : origin.kind
  const choose = (place: Pick<FoundPlace, "name" | "lat" | "lon">) => {
    onChange({ kind: "place", name: place.name.slice(0, ORIGIN_NAME_MAX), lat: place.lat, lon: place.lon })
    setChoosing(false)
  }
  const pick = (next: OriginSetting) => {
    setChoosing(false)
    onChange(next)
  }

  return (
    <Sheet title="어디서 출발하나요?" onClose={onClose}>
      <div className="q">
        <div className="hint">{originHint(origin, geoStatus, gpsArea)}</div>
        <div className="seg" role="group" aria-label="어디서 출발하나요?">
          <button type="button" aria-pressed={mode === "gps"} onClick={() => pick({ kind: "gps" })}>
            내 위치
          </button>
          <button type="button" aria-pressed={mode === "place"} onClick={() => setChoosing(true)}>
            직접 정하기
          </button>
          <button type="button" aria-pressed={mode === "none"} onClick={() => pick({ kind: "none" })}>
            정하지 않음
          </button>
        </div>
        {mode === "place" ? (
          <div className="origin-pick">
            <PlaceSearch
              label="출발 위치 검색"
              placeholder="동네, 도시, 역 이름으로 찾기"
              emptyHint="다른 이름으로 찾아 보세요."
              onSelect={choose}
            />
            <div className="chips" role="group" aria-label="도시에서 고르기">
              {QUICK_CITIES.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  aria-pressed={origin.kind === "place" && origin.name === city.name}
                  onClick={() => choose(city)}
                >
                  {city.name}
                </button>
              ))}
            </div>
            <div className="hint">지도에서 빈 곳을 누른 뒤 &quot;여기서 출발&quot;을 골라도 돼요.</div>
          </div>
        ) : null}
      </div>
      <div className="actions">
        <button type="button" className="btn primary" onClick={onClose}>
          확인
        </button>
      </div>
    </Sheet>
  )
}
