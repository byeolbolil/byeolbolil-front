/**
 * 지도의 구름 레이어에 그리는 구름장. 백엔드가 주는 격자 예보(한국과 주변 바다, 0.4° 간격의 시간별 총운량)를 받아
 * 지도에 얹을 그림으로 바꾼다.
 *
 * 격자 값은 고르게 다듬지 않고 점 사이만 선형으로 잇는다. 이웃 점과 평균을 내면 구름대의 경계가 한 칸씩 번져서,
 * 표식은 맑음인 장소 위에 구름이 그려진다.
 *
 * 격자는 약 40km 간격이라 구름의 실제 모양을 보여 주지 못한다. 어느 쪽이 흐리고 어느 쪽이 트였는지, 밤사이
 * 구름대가 어디로 움직이는지를 보는 용도다. 장소의 판정에는 쓰지 않는다. 판정은 장소마다 받은 예보로 한다.
 */

const BASE_PATH = "/api/v1/clouds"

/** 남서쪽 모서리에서 시작해 `step` 간격으로 북쪽과 동쪽으로 가는 격자 */
export interface CloudGrid {
  south: number
  west: number
  step: number
  rows: number
  columns: number
}

/** 한 시각의 격자 값 */
export interface CloudFrame {
  /** 이 시각(epoch ms)부터 1시간 */
  time: number
  /** 총운량(%). 남쪽 줄부터, 줄 안에서는 서쪽부터 */
  cover: number[]
}

export interface CloudNight {
  date: string
  /** 예보 출처. 지금은 OPEN_METEO뿐이다 */
  source: string
  grid: CloudGrid
  frames: CloudFrame[]
}

export class CloudFieldError extends Error {
  constructor(
    /** HTTP 상태 코드. 네트워크 오류나 형식 오류는 0이다 */
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "CloudFieldError"
  }
}

export function cloudNightUrl(date: string): string {
  return `${BASE_PATH}/nights/${date}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

function badShape(): never {
  throw new CloudFieldError(0, "구름 예보 응답의 형식이 올바르지 않습니다.")
}

/** 공통 응답 봉투에서 하룻밤의 구름 격자를 꺼낸다. 격자 크기와 값의 수가 맞지 않는 시각은 버린다 */
export function unwrapCloudNight(body: unknown): CloudNight {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) badShape()
  const data = body.data
  const grid = data.grid
  if (typeof data.date !== "string" || !isRecord(grid) || !Array.isArray(data.hours)) badShape()
  if (
    typeof grid.south !== "number" ||
    typeof grid.west !== "number" ||
    typeof grid.step !== "number" ||
    grid.step <= 0 ||
    !isCount(grid.rows) ||
    !isCount(grid.columns)
  ) {
    badShape()
  }
  const size = grid.rows * grid.columns
  const frames: CloudFrame[] = []
  for (const hour of data.hours) {
    if (!isRecord(hour) || typeof hour.time !== "string" || !Array.isArray(hour.cloudCover)) continue
    const time = Date.parse(hour.time)
    if (Number.isNaN(time) || hour.cloudCover.length !== size) continue
    if (!hour.cloudCover.every((value) => typeof value === "number")) continue
    frames.push({ time, cover: hour.cloudCover as number[] })
  }
  return {
    date: data.date,
    source: typeof data.source === "string" ? data.source : "",
    grid: { south: grid.south, west: grid.west, step: grid.step, rows: grid.rows, columns: grid.columns },
    frames,
  }
}

/** 하룻밤의 구름 격자를 받는다. 예보는 시간이 지나면 틀린 정보가 되므로 브라우저 캐시를 쓰지 않는다 */
export async function fetchCloudNight(date: string, signal?: AbortSignal): Promise<CloudNight> {
  let response: Response
  try {
    response = await fetch(cloudNightUrl(date), { headers: { Accept: "application/json" }, signal, cache: "no-store" })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new CloudFieldError(0, "서버에 연결하지 못했습니다.")
  }
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // 본문이 JSON이 아니면 아래에서 상태 코드로만 판단한다
  }
  if (!response.ok) {
    const message = isRecord(body) && typeof body.message === "string" ? body.message : `요청이 실패했습니다 (${response.status}).`
    throw new CloudFieldError(response.status, message)
  }
  return unwrapCloudNight(body)
}

/** 그 시각의 격자 값. 시각은 밤 추천의 `hours[].time`과 같은 문자열이다. 없으면 null */
export function frameAt(night: CloudNight | null, time: string | null): CloudFrame | null {
  if (!night || !time) return null
  const wanted = Date.parse(time)
  return night.frames.find((frame) => frame.time === wanted) ?? null
}

/** 격자의 바깥 점들이 놓인 범위 */
export function gridBounds(grid: CloudGrid) {
  return {
    west: grid.west,
    east: grid.west + grid.step * (grid.columns - 1),
    south: grid.south,
    north: grid.south + grid.step * (grid.rows - 1),
  }
}

/** MapLibre canvas 소스의 좌표 순서: 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래 */
export function gridCorners(grid: CloudGrid): [[number, number], [number, number], [number, number], [number, number]] {
  const { west, east, south, north } = gridBounds(grid)
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ]
}

/** 웹 메르카토르의 세로 좌표(라디안 단위) */
export function mercatorY(latitude: number): number {
  return Math.asinh(Math.tan((latitude * Math.PI) / 180))
}

function latitudeOf(y: number): number {
  return (Math.atan(Math.sinh(y)) * 180) / Math.PI
}

/** 그림의 크기. 가로를 정하면 세로는 메르카토르에서의 비율로 정해진다 */
export function fieldSize(grid: CloudGrid, width: number): { width: number; height: number } {
  const { west, east, south, north } = gridBounds(grid)
  const xSpan = ((east - west) * Math.PI) / 180
  const ySpan = mercatorY(north) - mercatorY(south)
  return { width, height: Math.max(1, Math.round((width * ySpan) / xSpan)) }
}

/**
 * 그림의 각 화소가 격자의 어느 네 점 사이에 있는지. 한 번 만들어 두고 시각마다 다시 쓴다.
 *
 * MapLibre는 그림을 네 귀퉁이 사이에서 메르카토르 평면으로 늘린다. 그래서 그림의 세로축은 위도가 아니라
 * 메르카토르 y에 비례해야 한다. 위도에 비례하게 그리면 범위 가운데가 남북으로 어긋난다.
 */
export interface FieldSampler {
  width: number
  height: number
  columns: number
  /** 화소마다 왼쪽 아래 격자점의 번호 */
  base: Int32Array
  /** 화소마다 동쪽 점, 북쪽 점으로 치우친 정도(0~1) */
  fx: Float32Array
  fy: Float32Array
  /** 화소마다 가장자리에서 흐려지는 정도(0~1). 그림의 테두리가 선으로 보이지 않게 한다 */
  edge: Float32Array
}

/** 가장자리에서 이만큼(그림 크기 대비)에 걸쳐 흐려진다 */
const EDGE_FADE = 0.12

/** 0에서 1로 부드럽게 올라간다. 흐려지기 시작하는 곳과 끝나는 곳에 꺾인 선이 보이지 않는다 */
function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

export function buildSampler(grid: CloudGrid, width: number): FieldSampler {
  const { height } = fieldSize(grid, width)
  const { south, north } = gridBounds(grid)
  const yNorth = mercatorY(north)
  const ySouth = mercatorY(south)
  const base = new Int32Array(width * height)
  const fx = new Float32Array(width * height)
  const fy = new Float32Array(width * height)
  const edge = new Float32Array(width * height)
  const lastColumn = grid.columns - 1
  const lastRow = grid.rows - 1

  for (let py = 0; py < height; py++) {
    // 위쪽 화소가 북쪽이다
    const ty = height === 1 ? 0 : py / (height - 1)
    const latitude = latitudeOf(yNorth + (ySouth - yNorth) * ty)
    const rowPosition = Math.min(lastRow, Math.max(0, (latitude - south) / grid.step))
    const row = Math.min(lastRow - 1, Math.floor(rowPosition))
    const edgeY = ease(Math.min(ty, 1 - ty) / EDGE_FADE)
    for (let px = 0; px < width; px++) {
      const tx = width === 1 ? 0 : px / (width - 1)
      const columnPosition = tx * lastColumn
      const column = Math.min(lastColumn - 1, Math.floor(columnPosition))
      const index = py * width + px
      base[index] = Math.max(0, row) * grid.columns + Math.max(0, column)
      fx[index] = lastColumn === 0 ? 0 : columnPosition - Math.max(0, column)
      fy[index] = lastRow === 0 ? 0 : rowPosition - Math.max(0, row)
      edge[index] = edgeY * ease(Math.min(tx, 1 - tx) / EDGE_FADE)
    }
  }
  return { width, height, columns: grid.columns, base, fx, fy, edge }
}

/**
 * 구름량(%)을 그림의 불투명도(0~1)로. 20% 아래는 그리지 않고 90%에서 가장 짙다.
 * 20%는 화면이 "구름 거의 없음"이라고 부르는 경계와 같다(7Timer!, `sources.ts`).
 */
export function cloudOpacity(cover: number): number {
  const t = Math.min(1, Math.max(0, (cover - 20) / 70))
  // 중간값이 너무 옅지 않게 살짝 올린다
  return t * (2 - t) * 0.78
}

/** 구름의 색. 밤하늘 위에서 달빛을 받은 구름처럼 푸른 기가 도는 흰색이다 */
const CLOUD_RGB = [206, 213, 230] as const

/** 격자 값을 RGBA 화소로 칠한다. `pixels`의 길이는 width × height × 4다 */
export function paintField(pixels: Uint8ClampedArray, sampler: FieldSampler, field: Float32Array): void {
  const { base, fx, fy, edge, columns } = sampler
  const single = field.length === 1
  for (let index = 0; index < base.length; index++) {
    const i = base[index]
    let cover: number
    if (single) {
      cover = field[0]
    } else {
      const east = Math.min(i + 1, field.length - 1)
      const north = Math.min(i + columns, field.length - 1)
      const northEast = Math.min(i + columns + 1, field.length - 1)
      const x = fx[index]
      const y = fy[index]
      const southValue = field[i] + (field[east] - field[i]) * x
      const northValue = field[north] + (field[northEast] - field[north]) * x
      cover = southValue + (northValue - southValue) * y
    }
    const offset = index * 4
    pixels[offset] = CLOUD_RGB[0]
    pixels[offset + 1] = CLOUD_RGB[1]
    pixels[offset + 2] = CLOUD_RGB[2]
    pixels[offset + 3] = Math.round(cloudOpacity(cover) * edge[index] * 255)
  }
}

/** 두 격자 사이의 값. `t`가 0이면 `from`, 1이면 `to`다 */
export function blendFields(from: Float32Array, to: Float32Array, t: number, out: Float32Array): Float32Array {
  for (let index = 0; index < out.length; index++) {
    out[index] = from[index] + (to[index] - from[index]) * t
  }
  return out
}
