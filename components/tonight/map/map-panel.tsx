"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { frameAt, frameTimeText } from "@/lib/tonight/cloud-field"
import type { FoundPlace, PickedPlace } from "@/lib/tonight/geocode"
import { hourTimeline, initialTimelineTime } from "@/lib/tonight/hours"
import { MAP_LAYERS, type MapLayer } from "@/lib/tonight/night-overlay"
import { placeKey } from "@/lib/tonight/place"
import type { Coordinates } from "@/lib/tonight/settings"
import { dayHourText, dayOfHour, hourOf, koreanHour } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"
import { useCloudNight } from "@/lib/tonight/use-cloud-night"
import { useIsTouch } from "@/lib/tonight/use-is-desktop"
import { PlaceSearch } from "../place-search"

// MapLibre는 window가 있어야 해서 브라우저에서만 불러온다
const NightMap = dynamic(() => import("./night-map"), {
  ssr: false,
  loading: () => <div className="mapwrap map-loading">지도를 불러오는 중이에요</div>,
})

/** 재생할 때 한 시간을 넘기는 간격. 0.9초는 구름이 움직이는 것을 눈으로 따라가기에 빨랐다 */
const PLAY_INTERVAL_MS = 1400

interface MapPanelProps {
  places: readonly NightPlace[]
  selectedKey: string | null
  topKey: string | null
  /** 보고 있는 밤이 시작하는 날짜. 구름 레이어가 그 밤의 구름 예보를 받는 데 쓴다 */
  nightDate: string | null
  /** 보고 있는 밤의 이름("오늘 밤", "내일 밤"). 구름 레이어가 어느 밤인지 적는다 */
  nightLabel?: string
  /**
   * `places`의 시간 예보가 어느 밤의 것인지. 없으면 `nightDate`와 같다고 본다. 넓은 화면에서 장소 화면의 날짜 칸으로
   * 다른 밤을 고르면 지도는 그 밤의 구름을 그리지만 표식은 후보 목록의 밤 그대로라, 표식은 구름 격자에서 읽은 값으로 칠한다
   */
  placesDate?: string | null
  onSelect: (key: string) => void
  /** 지도의 빈 곳을 누르거나 검색해서 고른 위치 */
  pick?: Coordinates | null
  onPick?: (place: PickedPlace) => void
  /** 이동 시간을 재는 출발 위치 */
  origin?: Coordinates | null
  /** 지도 위에 얹는 카드(모바일의 장소 미리보기) */
  children?: ReactNode
  /** 바깥에서 지도를 옮겨 보여 줄 곳. 목록에서 장소를 누르면 그쪽으로 간다. `at`이 바뀌면 같은 곳이라도 다시 옮긴다 */
  focusTo?: (Coordinates & { at: number }) | null
}

/**
 * 지도와 그 조작부. 위에는 지명 검색창이 있고, 레이어는 광해 지도, 구름, 일반 지도 셋이다.
 * 구름 레이어는 고른 시각의 구름 예보를 지도에 그리고, 각 장소의 예보 구름량으로 표식을 칠한다.
 * 구름장은 약 40km 간격의 격자 예보를 부드럽게 이은 것이라 큰 흐름만 보여 준다.
 */
export function MapPanel({
  places,
  selectedKey,
  topKey,
  nightDate,
  nightLabel = "오늘 밤",
  placesDate,
  onSelect,
  pick,
  onPick,
  origin,
  focusTo = null,
  children,
}: MapPanelProps) {
  const [layer, setLayer] = useState<MapLayer>("night")
  const touch = useIsTouch()
  /** 검색으로 고른 곳. 지도를 그쪽으로 옮긴다 */
  const [focus, setFocus] = useState<(Coordinates & { at: number }) | null>(null)
  const pickFound = (place: FoundPlace) => {
    setFocus({ lat: place.lat, lon: place.lon, at: Date.now() })
    onPick?.({ source: "search", name: place.name, address: place.address, lat: place.lat, lon: place.lon })
  }
  const [cloudTime, setCloudTime] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)

  // 구름 예보는 구름 레이어를 켰을 때만 받는다
  const clouds = useCloudNight(nightDate, layer === "cloud")
  // 시간 막대의 칸. 장소들의 시간 예보가 그 밤의 것이면 그 시각들을 쓰고(지난 시각은 빠져 있다),
  // 장소 화면에서 다른 밤을 고른 것처럼 밤이 다르면 그 밤의 구름 격자 시각을 쓴다
  const sameNight = (placesDate ?? nightDate) === nightDate
  const timeline = useMemo(
    () => (sameNight ? hourTimeline(places) : (clouds.night?.frames.map((frame) => frameTimeText(frame.time)) ?? [])),
    [sameNight, places, clouds.night],
  )
  const focusPlace = places.find((place) => placeKey(place) === (selectedKey ?? topKey)) ?? places[0]
  const timeIndex = cloudTime ? timeline.indexOf(cloudTime) : -1
  const shownTime = timeIndex >= 0 ? cloudTime : (initialTimelineTime(timeline, sameNight ? focusPlace : undefined) ?? null)
  const shownIndex = shownTime ? timeline.indexOf(shownTime) : -1
  const cloudFrame = frameAt(clouds.night, shownTime)

  useEffect(() => {
    if (!playing || layer !== "cloud") return
    const timer = window.setInterval(() => {
      setCloudTime((current) => {
        const index = current ? timeline.indexOf(current) : -1
        if (index < 0 || index >= timeline.length - 1) {
          setPlaying(false)
          return current
        }
        return timeline[index + 1]
      })
    }, PLAY_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [playing, layer, timeline])

  const togglePlay = () => {
    if (playing) {
      setPlaying(false)
      return
    }
    // 끝에서 누르면 처음부터 다시 돈다
    setCloudTime(shownIndex >= timeline.length - 1 ? (timeline[0] ?? null) : shownTime)
    setPlaying(true)
  }

  // 내 장소가 지도에 있을 때만 표식의 뜻을 적는다. 좁은 화면에서는 지도 아래 안내에 함께 나온다
  const mineKey = places.some((place) => place.type === "BOOKMARK") ? (
    <span className="pin-key mine-key">
      <i data-mine="1" /> 네모난 하늘색 표식은 북마크
    </span>
  ) : null

  const legend =
    layer === "night" ? (
      <>
        {/* 밝게 빛나는 곳이 불빛이라는 것은 설명 없이도 읽혀서, 뜻을 알기 어려운 푸른빛만 적는다 */}
        <ul className="light-key">
          <li>
            <i data-key="dark" />
            푸를수록 하늘이 어두워요
          </li>
        </ul>
        <div className="credit">자료: VIIRS 2024</div>
      </>
    ) : layer === "cloud" ? (
      <>
        {cloudFrame
          ? `${nightLabel}의 구름이에요. 하얗게 덮인 곳이 구름이고, 재생을 누르면 밤사이 움직임이 보여요`
          : clouds.status === "loading"
            ? "구름 예보를 받는 중이에요"
            : clouds.status === "error"
              ? "구름 예보를 받지 못했어요. 표식의 색으로만 보여드려요"
              : "이 시각의 구름 예보가 없어요. 표식의 색으로만 보여드려요"}
        <div className="ramp cloud" />
        <div className="rl">
          <span>구름 0%</span>
          <span>100%</span>
        </div>
        <div className="credit">
          표식의 색은 그 장소의 구름량이에요. 구름 그림은 약 40km 간격의 예보를 이은 것이라 큰 흐름만 보여줘요
          {cloudFrame ? " · 구름 예보: Open-Meteo (ECMWF IFS), CC BY 4.0" : ""}
        </div>
      </>
    ) : null

  return (
    <div className={`mapstack${layer === "cloud" ? " cloud" : ""}`}>
      <NightMap
        places={places}
        selectedKey={selectedKey}
        topKey={topKey}
        layer={layer}
        cloudTime={layer === "cloud" ? shownTime : null}
        cloudGrid={clouds.night?.grid ?? null}
        cloudCover={cloudFrame?.cover ?? null}
        onSelect={onSelect}
        pick={pick}
        onPick={onPick ? (position) => onPick({ source: "map", ...position }) : undefined}
        origin={origin}
        focus={focusTo && (!focus || focusTo.at > focus.at) ? focusTo : focus}
        controls={
          <div className="seg" role="group" aria-label="지도 레이어">
            {MAP_LAYERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={layer === option.value}
                onClick={() => {
                  setLayer(option.value)
                  if (option.value !== "cloud") setPlaying(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        {onPick ? (
          <PlaceSearch
            className="map-search"
            label="지도에서 장소 검색"
            placeholder="지역, 산, 천문대 이름으로 찾기"
            emptyHint={touch ? "지도에서 빈 곳을 꾹 눌러 직접 골라도 돼요." : "지도에서 빈 곳을 눌러 직접 골라도 돼요."}
            onSelect={pickFound}
          />
        ) : null}
        {legend || mineKey ? (
          <div className="map-card bl">
            {legend}
            {mineKey}
          </div>
        ) : null}
        {children}
      </NightMap>
      {layer === "cloud" && timeline.length > 0 ? (
        <div className="timebar">
          <button type="button" aria-label={playing ? "멈춤" : "재생"} onClick={togglePlay}>
            {playing ? (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          {/*
            구름은 고른 밤 하나의 해 진 뒤부터 아침까지다. 앞으로 몇 시간으로 읽히지 않게 양 끝 시각을 적고, 시각마다 그 시각이
            든 날짜("11/28 밤 11시", "11/29 새벽 1시")를 붙인다. 밤 이름("내일 밤")을 붙이면 자정 뒤가 날짜로 읽혀 거꾸로 가는 것처럼 보인다
          */}
          <div className="tl-track">
            <input
              type="range"
              min={0}
              max={timeline.length - 1}
              step={1}
              value={Math.max(0, shownIndex)}
              aria-label={`${nightLabel} 구름 시각`}
              aria-valuetext={shownTime ? dayHourText(shownTime) : undefined}
              onChange={(event) => {
                setPlaying(false)
                setCloudTime(timeline[Number(event.target.value)] ?? null)
              }}
            />
            <div className="tl-ends" aria-hidden="true">
              <span>{dayHourText(timeline[0])}</span>
              <span>{dayHourText(timeline[timeline.length - 1])}</span>
            </div>
          </div>
          <span className="tl-label">
            <small>{shownTime ? dayOfHour(shownTime) : ""}</small>
            {shownTime ? koreanHour(hourOf(shownTime)) : ""}
          </span>
        </div>
      ) : null}
      {legend || mineKey ? (
        <div className="map-legend">
          {legend}
          {mineKey}
        </div>
      ) : null}
    </div>
  )
}
