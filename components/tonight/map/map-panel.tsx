"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { hourTimeline, initialTimelineTime } from "@/lib/tonight/hours"
import { MAP_LAYERS, type MapLayer } from "@/lib/tonight/night-overlay"
import { placeKey } from "@/lib/tonight/place"
import { hourOf, koreanHour } from "@/lib/tonight/time"
import type { NightPlace } from "@/lib/tonight/types"

// MapLibre는 window가 있어야 해서 브라우저에서만 불러온다
const NightMap = dynamic(() => import("./night-map"), {
  ssr: false,
  loading: () => <div className="mapwrap map-loading">지도를 불러오는 중이에요</div>,
})

/** 재생할 때 한 시간을 넘기는 간격 */
const PLAY_INTERVAL_MS = 900

interface MapPanelProps {
  places: readonly NightPlace[]
  selectedKey: string | null
  topKey: string | null
  /** "오늘 밤" 같은 밤의 이름. 지도 위 안내에 적는다 */
  nightName: string
  onSelect: (key: string) => void
  /** 지도 위에 얹는 카드(모바일의 장소 미리보기) */
  children?: ReactNode
}

/**
 * 지도와 그 조작부. 레이어는 밤 불빛, 구름, 일반 지도 셋이다.
 * 구름 레이어는 구름장을 그리지 않는다. 고른 시각에 각 장소의 예보 구름량으로 표식을 칠할 뿐이다.
 */
export function MapPanel({ places, selectedKey, topKey, nightName, onSelect, children }: MapPanelProps) {
  const [layer, setLayer] = useState<MapLayer>("night")
  const [cloudTime, setCloudTime] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)

  const timeline = useMemo(() => hourTimeline(places), [places])
  const focusPlace = places.find((place) => placeKey(place) === (selectedKey ?? topKey)) ?? places[0]
  const timeIndex = cloudTime ? timeline.indexOf(cloudTime) : -1
  const shownTime = timeIndex >= 0 ? cloudTime : (initialTimelineTime(timeline, focusPlace) ?? null)
  const shownIndex = shownTime ? timeline.indexOf(shownTime) : -1

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

  const legend =
    layer === "night" ? (
      <>
        불빛이 밝은 곳일수록 별이 덜 보여요
        <div className="ramp night" />
        <div className="rl">
          <span>어두움</span>
          <span>밝음</span>
        </div>
        <div className="credit">야간광: VIIRS VNL 2024, Earth Observation Group</div>
      </>
    ) : layer === "cloud" ? (
      <>
        표식의 색은 고른 시각에 그 장소의 구름량이에요
        <div className="ramp cloud" />
        <div className="rl">
          <span>구름 0%</span>
          <span>100%</span>
        </div>
        <div className="credit">장소별 시간 예보예요. 장소 사이의 구름은 보여주지 않아요</div>
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
        onSelect={onSelect}
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
        <div className="map-card tl">
          <b>{nightName} 별 보기 좋은 곳</b>
          <br />
          별이 밝을수록 추천도가 높아요
        </div>
        {legend ? <div className="map-card bl">{legend}</div> : null}
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
          <input
            type="range"
            min={0}
            max={timeline.length - 1}
            step={1}
            value={Math.max(0, shownIndex)}
            aria-label="시각"
            aria-valuetext={shownTime ? koreanHour(hourOf(shownTime)) : undefined}
            onChange={(event) => {
              setPlaying(false)
              setCloudTime(timeline[Number(event.target.value)] ?? null)
            }}
          />
          <span className="tl-label">{shownTime ? koreanHour(hourOf(shownTime)) : ""}</span>
        </div>
      ) : null}
      {legend ? <div className="map-legend">{legend}</div> : null}
    </div>
  )
}
