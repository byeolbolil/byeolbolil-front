/**
 * 출발 위치로 고를 수 있는 도시. 위치 권한을 주지 않은 사람이 이동 시간을 보려면 출발지가 필요하다.
 * 좌표는 Natural Earth 10m populated places(퍼블릭 도메인)에서 가져왔고, 목업의 도시 목록과 같다.
 */
export interface City {
  name: string
  lat: number
  lon: number
}

export const CITIES: readonly City[] = [
  { name: "서울", lat: 37.568, lon: 126.998 },
  { name: "부산", lat: 35.097, lon: 129.008 },
  { name: "인천", lat: 37.478, lon: 126.64 },
  { name: "대구", lat: 35.869, lon: 128.605 },
  { name: "대전", lat: 36.337, lon: 127.423 },
  { name: "광주", lat: 35.173, lon: 126.908 },
  { name: "창원", lat: 35.219, lon: 128.584 },
  { name: "수원", lat: 37.26, lon: 127.009 },
  { name: "울산", lat: 35.549, lon: 129.315 },
  { name: "청주", lat: 36.644, lon: 127.501 },
  { name: "전주", lat: 35.831, lon: 127.14 },
  { name: "포항", lat: 36.021, lon: 129.372 },
  { name: "제주", lat: 33.51, lon: 126.522 },
  { name: "여수", lat: 34.737, lon: 127.746 },
  { name: "목포", lat: 34.807, lon: 126.396 },
  { name: "군산", lat: 35.982, lon: 126.716 },
  { name: "원주", lat: 37.355, lon: 127.94 },
  { name: "춘천", lat: 37.875, lon: 127.734 },
  { name: "강릉", lat: 37.756, lon: 128.896 },
  { name: "경주", lat: 35.843, lon: 129.212 },
  { name: "안동", lat: 36.566, lon: 128.725 },
  { name: "속초", lat: 38.209, lon: 128.591 },
]

export function findCity(name: string): City | undefined {
  return CITIES.find((city) => city.name === name)
}
