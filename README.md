# 별볼일

> 오늘 밤 별볼일 있나요?

오늘 밤 어디서 언제 별을 보면 좋은지 알려주는 서비스의 웹 프론트엔드다. 첫 화면에서 가장 좋은 곳 하나와 추천 시간대를
보여주고, 나머지 후보는 짧은 목록과 지도로 둔다. 백엔드는 별도 저장소(`stargazer`)에 있고, 화면의 기준은 그 저장소의
`docs/mockup/`이다.

## 화면

| 화면 | 내용 |
|---|---|
| 오늘 밤 | 가장 좋은 곳, 추천 시간대, 밤 시간 띠(훑으면 시간별 하늘), 후보 목록. 날짜를 바꿔 7일 뒤의 밤까지 볼 수 있다 |
| 자세히 보기 | 추천 시간의 점수와 구름, 광해 등급, 달 밝기, 습도, 예보 출처, 시간대별 구름과 점수 그래프 |
| 지도 | 밤 불빛, 구름, 일반 지도 레이어. 표식을 누르면 그 장소가 열리고, 빈 곳을 누르면 그 위치를 내 장소로 저장할 수 있다 |
| 내 장소 | 저장한 장소의 오늘 밤 평가. 로그인이 필요하다 |
| 설정 | 간단히/자세히, 몇 시까지 볼 수 있는지, 얼마나 멀리 갈 수 있는지, 출발 위치, 고급 기준 |
| 추천 기준과 출처 | 기준값마다 근거와 상태(출처 있음, 정책, 추정, 출처 없음) |

1080px 이상에서는 왼쪽에 지도, 오른쪽에 추천 패널이 놓이고, 그보다 좁으면 한 줄 화면과 하단 탭으로 바뀐다.
`/login`, `/oauth/callback`, `/guide`(별 사진 촬영 가이드)는 이전 그대로다.

## 기술 스택

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui (로그인과 가이드 화면)
- MapLibre GL JS, 바탕 지도는 [OpenFreeMap](https://openfreemap.org/)
- zustand (인증 상태, 설정), axios (인증과 북마크 API)
- vitest (단위 테스트), Playwright (브라우저 점검)
- 패키지 관리자는 pnpm

## 시작하기

Node.js 20 이상과 pnpm이 필요하다.

```bash
pnpm install
```

`.env.local`에 백엔드 주소를 적는다. 키는 필요 없다.

```bash
# 로컬 백엔드 (기본값)
NEXT_PUBLIC_API_URL=http://localhost:8080
# 운영 백엔드로 볼 때
# NEXT_PUBLIC_API_URL=https://api.byeolbolil.xyz
```

```bash
pnpm dev          # http://localhost:3000
```

Vercel에서는 `vercel.json`이 `NEXT_PUBLIC_API_URL`을 운영 백엔드로 넣어 준다.

## 명령

```bash
pnpm dev          # 개발 서버
pnpm build        # 빌드. 타입 검사를 함께 한다
pnpm start        # 빌드한 것을 실행. 서비스 워커는 여기서만 등록된다
pnpm test         # 단위 테스트 (vitest)
pnpm typecheck    # tsc --noEmit
pnpm walkthrough  # 브라우저로 화면 흐름을 따라가며 점검 (개발 서버가 떠 있어야 한다)
```

`pnpm walkthrough`는 Playwright의 Chromium을 쓴다. 처음 한 번 `npx playwright install chromium`으로 받는다.
모바일(390x844)과 PC(1440x900)에서 오늘 밤 추천, 후보 고르기, 밤 띠 훑기, 자세히 보기, 지도의 세 레이어와 표식,
설정 바꾸기, 추천 기준과 출처, 내 장소를 차례로 열어 `walkthrough-shots/`에 화면을 찍는다. 설정을 바꾼 뒤 요청 쿼리가
바뀌었는지, 지도 표식과 목록의 선택이 맞는지, 콘솔 오류가 없는지도 확인한다. 추천은 실제 백엔드에서 받고,
인증 API 호출은 브라우저 안에서 막는다.

## 구조

```
app/
  layout.tsx, globals.css   글꼴(Noto Sans KR), 다크 단일 테마의 색
  page.tsx                  메인 화면
  manifest.ts               웹 앱 매니페스트
  login/, oauth/callback/   로그인 (이전 그대로)
  guide/                    별 사진 촬영 가이드
components/
  tonight/                  메인 화면
    tonight-app.tsx         탭, 선택 상태, 설정과 추천을 잇는 곳
    tonight-view.tsx        오늘 밤 추천 (가장 좋은 곳, 후보 목록, 가볼 만한 곳이 없는 밤)
    hero-card.tsx           장소 하나의 밤 (사진, 추천 시간대, 짧은 설명)
    night-band.tsx          밤 시간 띠
    detail-view.tsx, more-block.tsx, hour-chart.tsx   자세히 보기
    settings-sheet.tsx, sources-sheet.tsx             설정, 추천 기준과 출처
    my-places.tsx, save-place-sheet.tsx               내 장소
    map/                    MapLibre 지도와 레이어
    tonight.css             화면 스타일
  auth/, ui/, header.tsx    인증 초기화, shadcn/ui, 로그인과 가이드 화면의 머리
  pwa/                      서비스 워커 등록
lib/
  tonight/                  밤 추천 API와 화면 로직
    api.ts, types.ts        API 클라이언트와 응답 타입
    wording.ts              등급, 밤 패턴, 주의 사항의 문구
    time.ts, hours.ts, place.ts, facts.ts   시각 표기, 시간 칸 고르기, 장소 표기, 카드 문구
    settings.ts             설정과 API 쿼리 사이의 변환
    sources.ts              추천 기준과 출처의 내용
    night-overlay.ts        밤 불빛 이미지의 좌표와 지도 스타일
    *.test.ts               단위 테스트
  api/, store/              인증과 북마크 클라이언트, zustand 저장소 (이전 그대로)
public/
  sky/                      하늘 사진
  map/night-lights.webp     밤 불빛 이미지
  icons/, sw.js, offline.html   설치용 아이콘, 서비스 워커, 연결이 없을 때의 화면
scripts/
  render_night_overlay.py   밤 불빛 이미지 만들기
  render_icons.py           아이콘 만들기
  walkthrough.mjs           브라우저 점검
```

## API

밤 추천은 `GET /api/v1/recommendations/tonight`과 `GET /api/v1/recommendations/nights/{date}`를 쓴다.
요청과 응답은 백엔드 저장소의 `docs/MOBILE_DEVELOPER_GUIDE.md` 5.10에 있다.

- 이 두 API는 같은 출처의 `/api/...`로 부르고 `next.config.mjs`의 rewrite가 백엔드로 넘긴다. 백엔드 CORS가
  운영 도메인과 `localhost:3000`만 허용해서, 브라우저가 백엔드를 직접 부르면 Vercel 미리보기 주소에서 막힌다.
- 로그인, 회원, 북마크는 이전처럼 `lib/api`의 axios 클라이언트가 백엔드를 직접 부른다.
- 등급, 밤 패턴, 주의 사항은 enum 이름으로 온다. 문구는 `lib/tonight/wording.ts`에서 붙인다.
- 설정은 쿼리로 옮겨 보낸다. 몇 시까지는 `preferBefore`, 얼마나 멀리는 `maxTravelMinutes`, 맑은 시간 기준은
  `minClearHours`다. 출발 위치는 소수 둘째 자리(약 1km)로 줄여서 `lat`, `lon`으로 보낸다.
- API가 주지 않는 값은 화면에 만들어 넣지 않는다. 예보의 출처와 생성 시각은 목록 아래와 자세히 보기에 적는다.

## 지도와 이미지

- 바탕 지도는 OpenFreeMap의 공개 스타일(`dark`, `liberty`)이다. 가입이나 키 없이 쓸 수 있고 출처 표기가 필요하다.
  MapLibre가 지도 오른쪽 아래에 "OpenFreeMap © OpenMapTiles Data from OpenStreetMap"을 적는다.
- 밤 불빛은 백엔드 저장소의 `light_pollution_korea.csv`(VIIRS Nighttime Lights 2024 기반)를 웹 메르카토르로 그린
  이미지다. 다시 만들려면 다음을 실행한다. 범위를 바꾸면 `lib/tonight/night-overlay.ts`의 좌표도 함께 바꾼다.

  ```bash
  python scripts/render_night_overlay.py <백엔드 저장소>/src/main/resources/light_pollution_korea.csv public/map/night-lights.webp
  ```

- 구름 레이어는 구름의 모양을 그리지 않는다. 고른 시각에 각 장소의 예보 구름량으로 표식을 칠한다.
- 하늘 사진은 재사용이 허락된 자료만 내려받아 쓴다. 작가와 라이선스는 사진 위와 "추천 기준과 출처"에 적는다.

  | 파일 | 출처 | 라이선스 |
  |---|---|---|
  | `sky-clear.jpg` | ["밤하늘의 은하수"](https://commons.wikimedia.org/wiki/File:%EB%B0%A4%ED%95%98%EB%8A%98%EC%9D%98_%EC%9D%80%ED%95%98%EC%88%98.jpg), 이원웅(INSOLMAE) | CC BY-SA 3.0 |
  | `sky-moon.jpg` | ["덕유산의 밤"](https://commons.wikimedia.org/wiki/File:%EB%8D%95%EC%9C%A0%EC%82%B0%EC%9D%98_%EB%B0%A4.jpg), Mg shin | CC BY-SA 3.0 |
  | `sky-cloudy.jpg` | ["Night Clouds"](https://commons.wikimedia.org/wiki/File:Night_Clouds_(11424694453).jpg), Bureau of Land Management Oregon and Washington | 퍼블릭 도메인 |

## 설치형 웹 앱 (PWA)

매니페스트와 아이콘, 서비스 워커가 있어서 홈 화면에 설치할 수 있다. 서비스 워커(`public/sw.js`)의 캐시 정책은 다음과 같다.

- `/api` 응답과 페이지 HTML은 캐시하지 않는다. 예보는 시간이 지나면 틀린 정보가 되기 때문이다.
- 연결이 끊기면 지난 추천 대신 연결이 없다는 화면(`offline.html`)을 보여준다.
- 주소에 해시가 들어 있는 빌드 산출물(`/_next/static/`)은 캐시에서 먼저 답한다.
- 사진, 밤 불빛 이미지, 아이콘은 캐시로 먼저 답하고 뒤에서 새로 받아 둔다.

개발 서버에서는 서비스 워커를 등록하지 않는다.
