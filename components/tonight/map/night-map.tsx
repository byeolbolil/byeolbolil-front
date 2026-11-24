"use client"

import { AttributionControl, type CanvasSource, Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useRef, type ReactNode } from "react"
import {
  blendFields,
  buildSampler,
  gridCorners,
  paintField,
  type CloudGrid,
  type FieldSampler,
} from "@/lib/tonight/cloud-field"
import { hourAt } from "@/lib/tonight/hours"
import { KOREA_BOUNDS, MAP_STYLES, NIGHT_OVERLAY, NIGHT_OVERLAY_CORNERS, type MapLayer } from "@/lib/tonight/night-overlay"
import { placeKey } from "@/lib/tonight/place"
import type { Coordinates } from "@/lib/tonight/settings"
import type { NightPlace } from "@/lib/tonight/types"
import { levelStars, levelText } from "@/lib/tonight/wording"
import { STAR_PATH } from "../icons"

const SVG_NS = "http://www.w3.org/2000/svg"
const OVERLAY_ID = "night-lights"
const CLOUD_ID = "cloud-field"
/** 구름 그림의 가로 화소 수. 격자가 40km 간격이라 이보다 촘촘해도 더 보이는 것이 없다 */
const CLOUD_WIDTH = 288
/** 시각이 바뀔 때 앞 시각의 구름에서 다음 시각의 구름으로 넘어가는 시간 */
const CLOUD_TWEEN_MS = 650
/** 이 줌부터는 모든 표식에 이름을 붙인다. 그보다 멀면 고른 곳과 가장 좋은 곳만 붙인다. */
const LABEL_ZOOM = 8.5
/** 검색으로 고른 곳으로 옮길 때 적어도 이만큼은 당긴다. 군 하나가 화면에 들어오는 정도다 */
const SEARCH_ZOOM = 9.5
const FIT_PADDING = 28

// MapLibre 6은 워커를 별도 파일로 두고 그 주소를 알려 줘야 한다. 번들러가 파일을 정적 자산으로 내보낸다.
const WORKER_URL = new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href

interface NightMapProps {
  places: readonly NightPlace[]
  /** 고른 장소의 키. 표식을 키우고 이름을 붙인다 */
  selectedKey: string | null
  /** 가장 좋은 곳의 키. 항상 이름을 붙인다 */
  topKey: string | null
  layer: MapLayer
  /** 구름 레이어에서 고른 시각 */
  cloudTime: string | null
  /** 구름장을 그릴 격자와 고른 시각의 값. 없으면 구름장 없이 표식만 칠한다 */
  cloudGrid?: CloudGrid | null
  cloudCover?: readonly number[] | null
  onSelect: (key: string) => void
  /** 지도의 빈 곳을 눌러 고른 위치 */
  pick?: Coordinates | null
  onPick?: (position: Coordinates) => void
  /** 이동 시간을 재는 출발 위치. 있으면 지도에 표시한다 */
  origin?: Coordinates | null
  /** 지도를 옮겨 보여 줄 곳. `at`이 바뀌면 같은 좌표라도 다시 옮긴다 */
  focus?: (Coordinates & { at: number }) | null
  /** 지도 위 오른쪽에 놓는 조작부(레이어 전환) */
  controls?: ReactNode
  /** 지도 위에 얹는 카드들 */
  children?: ReactNode
}

function styleUrl(layer: MapLayer): string {
  return layer === "base" ? MAP_STYLES.base : MAP_STYLES.dark
}

/** 어두운 공개 스타일이 가리키지만 스프라이트에는 없는 아이콘. 그대로 두면 지도를 그릴 때마다 경고가 난다. */
const MISSING_ICON = "circle-11"

/** 지명을 한글로 적는다. OpenMapTiles의 `name`은 그 지역의 표기라서 한국 안에서는 한글이다. */
function localizeLabels(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== "symbol") continue
    const icon = map.getLayoutProperty(layer.id, "icon-image")
    if (icon && JSON.stringify(icon).includes(MISSING_ICON)) map.setLayoutProperty(layer.id, "icon-image", undefined)
    const field = map.getLayoutProperty(layer.id, "text-field")
    if (field && JSON.stringify(field).includes("name:latin")) {
      map.setLayoutProperty(layer.id, "text-field", ["coalesce", ["get", "name:ko"], ["get", "name"]])
    }
  }
}

/** 어두운 지도를 화면의 남색에 맞추고, 그 위에 밤 불빛 이미지를 얹는다. 지명은 불빛 위에 오도록 글자 레이어 아래에 넣는다. */
function decorateDark(map: MapLibreMap, layer: MapLayer) {
  const paint: Array<[string, "background-color" | "fill-color" | "line-color", string]> = [
    ["background", "background-color", "#11152a"],
    ["water", "fill-color", "#060916"],
    ["waterway", "line-color", "#060916"],
    ["landcover_wood", "fill-color", "#141a33"],
    ["landuse_park", "fill-color", "#141a33"],
    ["building", "fill-color", "#0d1124"],
  ]
  for (const [id, property, value] of paint) {
    if (map.getLayer(id)) map.setPaintProperty(id, property, value)
  }
  for (const styleLayer of map.getStyle().layers) {
    if (styleLayer.type === "symbol" && styleLayer.id.startsWith("place_")) {
      // 밝은 불빛 위에서도 읽히도록 글자를 밝게 하고 어두운 테두리를 두른다
      map.setPaintProperty(styleLayer.id, "text-color", "#d9deec")
      map.setPaintProperty(styleLayer.id, "text-halo-color", "rgba(8, 11, 26, 0.9)")
      map.setPaintProperty(styleLayer.id, "text-halo-width", 1.4)
    }
  }
  if (!map.getSource(OVERLAY_ID)) {
    map.addSource(OVERLAY_ID, { type: "image", url: NIGHT_OVERLAY.url, coordinates: NIGHT_OVERLAY_CORNERS })
  }
  if (!map.getLayer(OVERLAY_ID)) {
    // 도로와 경계선까지 덮고 지명만 위에 남긴다. 글자 레이어가 선 레이어 사이에 섞여 있어서 마지막 선 레이어 다음을 찾는다
    const layers = map.getStyle().layers
    let lastShape = -1
    layers.forEach((styleLayer, index) => {
      if (styleLayer.type !== "symbol") lastShape = index
    })
    map.addLayer(
      { id: OVERLAY_ID, type: "raster", source: OVERLAY_ID, paint: { "raster-fade-duration": 0 } },
      layers[lastShape + 1]?.id,
    )
  }
  tuneOverlay(map, layer)
}

/** 구름장을 그리는 캔버스와, 지금 지도에 보이는 값 */
interface CloudPainter {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  image: ImageData
  sampler: FieldSampler
  grid: CloudGrid
  /** 지금 그려져 있는 값. 아직 아무것도 그리지 않았으면 null */
  shown: Float32Array | null
  frame: number | null
}

function isSameGrid(a: CloudGrid, b: CloudGrid): boolean {
  return a.south === b.south && a.west === b.west && a.step === b.step && a.rows === b.rows && a.columns === b.columns
}

function createCloudPainter(grid: CloudGrid): CloudPainter | null {
  const sampler = buildSampler(grid, CLOUD_WIDTH)
  const canvas = document.createElement("canvas")
  canvas.width = sampler.width
  canvas.height = sampler.height
  const context = canvas.getContext("2d")
  if (!context) return null
  const image = context.createImageData(sampler.width, sampler.height)
  return { canvas, context, image, sampler, grid, shown: null, frame: null }
}

/** 지도 스타일에 구름 그림을 얹는다. 밤 불빛 위, 지명 아래에 둔다. 스타일을 갈아 끼우면 다시 불러야 한다 */
function attachCloudLayer(map: MapLibreMap, painter: CloudPainter) {
  if (!map.getSource(CLOUD_ID)) {
    map.addSource(CLOUD_ID, {
      type: "canvas",
      canvas: painter.canvas,
      coordinates: gridCorners(painter.grid),
      animate: false,
    })
  }
  if (!map.getLayer(CLOUD_ID)) {
    const layers = map.getStyle().layers
    const overlayIndex = layers.findIndex((styleLayer) => styleLayer.id === OVERLAY_ID)
    const firstLabel = layers.find((styleLayer, index) => index > overlayIndex && styleLayer.type === "symbol")
    map.addLayer(
      {
        id: CLOUD_ID,
        type: "raster",
        source: CLOUD_ID,
        paint: { "raster-fade-duration": 0, "raster-resampling": "linear" },
      },
      firstLabel?.id,
    )
  }
}

function detachCloudLayer(map: MapLibreMap) {
  if (map.getLayer(CLOUD_ID)) map.removeLayer(CLOUD_ID)
  if (map.getSource(CLOUD_ID)) map.removeSource(CLOUD_ID)
}

/** 캔버스에 값을 칠하고 지도가 그것을 다시 읽게 한다 */
function drawCloud(map: MapLibreMap, painter: CloudPainter, field: Float32Array) {
  paintField(painter.image.data, painter.sampler, field)
  painter.context.putImageData(painter.image, 0, 0)
  const source = map.getSource(CLOUD_ID) as CanvasSource | undefined
  // 움직이지 않는 캔버스 소스는 play와 pause를 이어 불러야 그림을 다시 읽는다
  source?.play()
  source?.pause()
  map.triggerRepaint()
}

/** 구름 레이어에서는 표식이 잘 보이도록 불빛을 흐리게 둔다. */
function tuneOverlay(map: MapLibreMap, layer: MapLayer) {
  if (!map.getLayer(OVERLAY_ID)) return
  // 불빛은 전국을 한눈에 볼 때를 기준으로 번지게 그려서, 가까이 당기면 지명이 묻히지 않도록 옅게 한다
  const strength = layer === "cloud" ? 0.4 : 1
  map.setPaintProperty(OVERLAY_ID, "raster-opacity", ["interpolate", ["linear"], ["zoom"], 7, strength, 11, strength * 0.55])
  map.setPaintProperty(OVERLAY_ID, "raster-saturation", layer === "cloud" ? -0.6 : 0)
}

function starSvg(opacity: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  const path = document.createElementNS(SVG_NS, "path")
  path.setAttribute("d", STAR_PATH)
  path.setAttribute("fill", "var(--star)")
  path.setAttribute("opacity", String(opacity))
  svg.appendChild(path)
  return svg
}

interface MarkerEntry {
  marker: Marker
  element: HTMLButtonElement
}

/** 표식 하나의 모양을 지금 상태에 맞춘다. */
function paintMarker(
  entry: MarkerEntry,
  place: NightPlace,
  state: { selected: boolean; top: boolean; layer: MapLayer; cloudTime: string | null },
) {
  const { element, marker } = entry
  const stars = levelStars(place.level)
  // MapLibre가 붙인 클래스(위치를 잡는 데 쓴다)를 지우지 않도록 필요한 것만 켜고 끈다
  element.classList.add("pin")
  element.classList.toggle("sel", state.selected)
  element.classList.toggle("top", state.top)
  element.style.zIndex = state.selected ? "3" : state.top ? "2" : "1"
  element.replaceChildren()

  const mark = document.createElement("span")
  mark.className = "mk"
  const label = document.createElement("span")
  label.className = "pl"
  label.textContent = place.name

  if (state.layer === "cloud") {
    const hour = state.cloudTime ? hourAt(place.hours, state.cloudTime) : undefined
    const dot = document.createElement("i")
    if (hour) {
      // 금색(구름 0%)에서 회색(100%)으로 이어지는 색. 그 장소의 그 시각 예보값만 쓴다
      dot.className = "cdot"
      dot.style.background = `color-mix(in oklch, var(--cloud) ${hour.cloudCover}%, var(--star))`
      const cover = document.createElement("span")
      cover.className = "cc"
      cover.textContent = `구름 ${hour.cloudCover}%`
      label.appendChild(cover)
      element.setAttribute("aria-label", `${place.name}, 구름 ${hour.cloudCover}%`)
    } else {
      dot.className = "cdot none"
      const cover = document.createElement("span")
      cover.className = "cc"
      cover.textContent = "예보 없음"
      label.appendChild(cover)
      element.setAttribute("aria-label", `${place.name}, 이 시각 예보 없음`)
    }
    mark.appendChild(dot)
  } else {
    if (stars > 0) {
      mark.appendChild(starSvg(0.45 + stars * 0.18))
    } else {
      const dot = document.createElement("i")
      dot.className = "dot0"
      mark.appendChild(dot)
    }
    element.setAttribute("aria-label", `${place.name}, ${levelText(place.level)}`)
  }
  element.append(mark, label)
  // 표식의 가운데가 좌표에 오도록 맞춘다. 고른 표식은 더 크다
  marker.setOffset([state.selected ? -15 : -10, 0])
}

/**
 * MapLibre 지도. 추천 장소를 표식으로 올리고 레이어에 따라 모양을 바꾼다.
 * 밤 불빛은 VIIRS 값으로 직접 그린 이미지, 구름은 장소별 시간 예보로 칠한 표식, 일반 지도는 기본 지도만이다.
 */
export default function NightMap({
  places,
  selectedKey,
  topKey,
  layer,
  cloudTime,
  cloudGrid = null,
  cloudCover = null,
  onSelect,
  pick = null,
  onPick,
  origin = null,
  focus = null,
  controls,
  children,
}: NightMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef(new Map<string, MarkerEntry>())
  const layerRef = useRef(layer)
  const styleRef = useRef(styleUrl(layer))
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  const pickMarkerRef = useRef<Marker | null>(null)
  const originMarkerRef = useRef<Marker | null>(null)
  const cloudPainterRef = useRef<CloudPainter | null>(null)
  /** 스타일을 갈아 끼운 뒤 구름 그림을 다시 얹는 함수. 그릴 것이 없으면 아무것도 하지 않는다 */
  const restoreCloudRef = useRef<() => void>(() => {})
  /** 지도 스타일을 다 읽어서 레이어를 얹을 수 있는지. 스타일을 갈아 끼우는 동안은 false다 */
  const styleReadyRef = useRef(false)
  layerRef.current = layer

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    setWorkerUrl(WORKER_URL)
    const map = new MapLibreMap({
      container,
      style: styleRef.current,
      bounds: KOREA_BOUNDS,
      fitBoundsOptions: { padding: FIT_PADDING },
      minZoom: 5,
      maxZoom: 12,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.addControl(new AttributionControl({ compact: true }), "bottom-right")
    map.on("style.load", () => {
      localizeLabels(map)
      if (layerRef.current !== "base") decorateDark(map, layerRef.current)
      styleReadyRef.current = true
      restoreCloudRef.current()
    })
    map.on("click", (event) => onPickRef.current?.({ lat: event.lngLat.lat, lon: event.lngLat.lng }))
    const onZoom = () => container.classList.toggle("near", map.getZoom() >= LABEL_ZOOM)
    map.on("zoom", onZoom)
    mapRef.current = map
    const markers = markersRef.current

    return () => {
      for (const entry of markers.values()) entry.marker.remove()
      markers.clear()
      pickMarkerRef.current = null
      originMarkerRef.current = null
      if (cloudPainterRef.current?.frame != null) cancelAnimationFrame(cloudPainterRef.current.frame)
      cloudPainterRef.current = null
      styleReadyRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [])

  // 레이어 전환. 일반 지도와 어두운 지도는 스타일이 달라서 갈아 끼우고, 밤 불빛과 구름 사이는 불빛의 세기만 바꾼다
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const wanted = styleUrl(layer)
    if (styleRef.current !== wanted) {
      styleRef.current = wanted
      styleReadyRef.current = false
      map.setStyle(wanted)
    } else {
      tuneOverlay(map, layer)
    }
  }, [layer])

  // 구름장. 고른 시각이 바뀌면 앞 시각의 구름에서 새 시각의 구름으로 천천히 넘어간다
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const hide = () => {
      const painter = cloudPainterRef.current
      if (painter?.frame != null) cancelAnimationFrame(painter.frame)
      if (painter) {
        painter.frame = null
        painter.shown = null
      }
      restoreCloudRef.current = () => {}
      if (styleReadyRef.current) detachCloudLayer(map)
    }
    if (layer !== "cloud" || !cloudGrid || !cloudCover) {
      hide()
      return
    }

    let painter = cloudPainterRef.current
    if (!painter || !isSameGrid(painter.grid, cloudGrid)) {
      hide()
      painter = createCloudPainter(cloudGrid)
      cloudPainterRef.current = painter
    }
    if (!painter) return
    const active = painter
    const target = Float32Array.from(cloudCover)

    const show = () => {
      attachCloudLayer(map, active)
      if (active.frame != null) cancelAnimationFrame(active.frame)
      // 넘어가는 도중에 다음 시각이 오면 지금 보이는 값에서 이어 간다
      const from = active.shown ? Float32Array.from(active.shown) : null
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (!from || reduceMotion) {
        active.shown = target
        active.frame = null
        drawCloud(map, active, target)
        return
      }
      const start = performance.now()
      const mixed = new Float32Array(target.length)
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / CLOUD_TWEEN_MS)
        drawCloud(map, active, blendFields(from, target, t, mixed))
        if (t < 1) {
          active.shown = mixed
          active.frame = requestAnimationFrame(step)
        } else {
          active.shown = target
          active.frame = null
        }
      }
      active.frame = requestAnimationFrame(step)
    }

    // 스타일이 아직 바뀌는 중이면 다 바뀐 뒤에 얹는다
    restoreCloudRef.current = show
    if (styleReadyRef.current) show()
  }, [layer, cloudGrid, cloudCover])

  // 표식 맞추기
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    const seen = new Set<string>()
    for (const place of places) {
      const key = placeKey(place)
      seen.add(key)
      let entry = markers.get(key)
      if (!entry) {
        const element = document.createElement("button")
        element.type = "button"
        element.addEventListener("click", (event) => {
          event.stopPropagation()
          onSelectRef.current(key)
        })
        const marker = new Marker({ element, anchor: "left" }).setLngLat([place.longitude, place.latitude]).addTo(map)
        entry = { marker, element }
        markers.set(key, entry)
      } else {
        entry.marker.setLngLat([place.longitude, place.latitude])
      }
      paintMarker(entry, place, { selected: key === selectedKey, top: key === topKey, layer, cloudTime })
    }
    for (const [key, entry] of markers) {
      if (!seen.has(key)) {
        entry.marker.remove()
        markers.delete(key)
      }
    }
  }, [places, selectedKey, topKey, layer, cloudTime])

  // 고른 위치 표시
  const pickLat = pick?.lat ?? null
  const pickLon = pick?.lon ?? null
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    pickMarkerRef.current?.remove()
    pickMarkerRef.current = null
    if (pickLat === null || pickLon === null) return
    const element = document.createElement("i")
    element.className = "pick"
    pickMarkerRef.current = new Marker({ element, anchor: "center" }).setLngLat([pickLon, pickLat]).addTo(map)
  }, [pickLat, pickLon])

  // 출발 위치 표시. 이동 시간을 어디서부터 재는지 지도에서 보이게 한다
  const originLat = origin?.lat ?? null
  const originLon = origin?.lon ?? null
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    originMarkerRef.current?.remove()
    originMarkerRef.current = null
    if (originLat === null || originLon === null) return
    const element = document.createElement("div")
    element.className = "origin"
    element.setAttribute("role", "img")
    element.setAttribute("aria-label", "출발 위치")
    const dot = document.createElement("i")
    const label = document.createElement("span")
    label.textContent = "출발"
    element.append(dot, label)
    // 점의 가운데가 좌표에 오도록 점 반지름만큼 왼쪽으로 민다
    originMarkerRef.current = new Marker({ element, anchor: "left", offset: [-8, 0] })
      .setLngLat([originLon, originLat])
      .addTo(map)
  }, [originLat, originLon])

  // 검색으로 고른 곳으로 옮긴다
  const focusLat = focus?.lat ?? null
  const focusLon = focus?.lon ?? null
  const focusAt = focus?.at ?? null
  useEffect(() => {
    const map = mapRef.current
    if (!map || focusLat === null || focusLon === null) return
    map.flyTo({ center: [focusLon, focusLat], zoom: Math.max(map.getZoom(), SEARCH_ZOOM) })
  }, [focusLat, focusLon, focusAt])

  // 고른 장소가 화면 밖에 있으면 그쪽으로 옮긴다
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedKey) return
    const place = places.find((candidate) => placeKey(candidate) === selectedKey)
    if (!place) return
    const position: [number, number] = [place.longitude, place.latitude]
    if (!map.getBounds().contains(position)) map.easeTo({ center: position })
    // 장소 목록이 바뀔 때마다 지도를 옮기지 않도록 고른 장소가 바뀔 때만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey])

  const zoomBy = (delta: number) => mapRef.current?.easeTo({ zoom: mapRef.current.getZoom() + delta })
  const resetView = () => mapRef.current?.fitBounds(KOREA_BOUNDS, { padding: FIT_PADDING })

  return (
    <div className="mapwrap">
      <div ref={containerRef} className="mapcanvas" data-layer={layer} />
      <div className="map-ctl">
        {controls}
        <div className="zoom-btns">
          <button type="button" aria-label="확대" onClick={() => zoomBy(1)}>
            +
          </button>
          <button type="button" aria-label="축소" onClick={() => zoomBy(-1)}>
            −
          </button>
          <button type="button" aria-label="처음 범위" onClick={resetView}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" />
            </svg>
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}
