# 별볼일

> 오늘 밤 별볼일 있나요?

오늘 밤 어디서 언제 별을 보면 좋은지 알려주는 서비스의 웹 프론트엔드다. 첫 화면에서 가장 좋은 곳 하나와 추천 시간대를
보여주고, 나머지 후보는 짧은 목록과 지도로 둔다. 백엔드는 별도 저장소(`stargazer`)에 있고, 화면의 기준은 그 저장소의
`docs/mockup/`이다.

## 화면

| 화면 | 내용 |
|---|---|
| 목록 | 그 밤을 고르는 날짜 줄(그 밤 전국에서 가장 좋은 곳의 등급), 가장 좋은 곳, 내 장소(로그인했을 때, 줄마다 일곱 밤), 후보 순위 |
| 장소 | 목록, 지도, 내 장소에서 누르면 열린다. 위의 날짜 줄은 그 장소의 일곱 밤이고 날짜를 눌러도 장소는 그대로다. 카드는 그 밤(볼 시간, 밤 띠, 점수와 조건)과 장소 소개 두 탭 |
| 지도 | 광해(하늘 밝기), 구름, 일반 지도 레이어. 표식을 누르면 장소 화면이 열리고, 빈 곳을 누르면 그 자리의 하늘 밝기를 보고 내 장소로 저장할 수 있다 |
| 별 사진 찍기 | 머리의 사진기 버튼으로 여는 시트. 갤럭시와 아이폰을 골라 순서와 설정을 본다 |
| 설정 | 몇 시까지 볼 수 있는지, 얼마나 멀리 갈 수 있는지, 출발 위치, 고급 기준 |
| 추천 기준과 출처 | 기준값마다 근거와 상태(출처 있음, 정책, 추정, 출처 없음) |

1080px 이상에서는 왼쪽에 지도, 가운데에 장소, 오른쪽에 그 밤의 목록이 놓이고, 그보다 좁으면 한 줄 화면에 아래의
목록/지도 전환이 붙는다. 로그인은 보던 화면 위의 시트로 뜬다. `/login`, `/oauth/callback`은 이전 그대로다.

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
pnpm scenarios    # 쓰는 흐름을 따라 하며 화면끼리 어긋나지 않는지 점검 (개발 서버가 떠 있어야 한다)
```

`pnpm walkthrough`와 `pnpm scenarios`는 Playwright의 Chromium을 쓴다. 처음 한 번 `npx playwright install chromium`으로 받는다.
둘 다 `--base http://localhost:3000`으로 개발 서버의 주소를 바꿀 수 있다.

`pnpm walkthrough`는 모바일(390x844)과 PC(1440x900)에서 오늘 밤 추천, 후보 고르기, 밤 띠 훑기, 자세히 보기, 별 사진 찍기,
지도의 세 레이어와 표식, 설정 바꾸기, 추천 기준과 출처를 차례로 열어 `walkthrough-shots/`에 화면을 찍는다. 설정을 바꾼 뒤
요청 쿼리가 바뀌었는지, 지도 표식과 목록의 선택이 맞는지, 콘솔 오류가 없는지도 확인한다. 추천은 실제 백엔드에서 받고,
인증 API 호출은 브라우저 안에서 막는다.

`pnpm scenarios`는 여러 화면을 오가는 흐름을 따라 한다. 시트와 뒤로 가기, 장소 화면과 후보 목록과 지도가 같은 밤을
말하는지, 좁은 화면의 지도 탭, 지도를 꾹 눌러 고르기, 구름 시간 막대의 날짜 순서, 월령 달력과 촬영 안내의 입구(가볼 만한 곳이 없는 밤 포함),
닉네임 바꾸기(로그인과 회원 API는 브라우저 안에서 흉내 낸다)를 본다.
`--only 이름`(back, nights, mapTab, longPress, cloudTimes, moon, emptyNight, nickname)으로 하나만 돌릴 수 있다. 그날의 실제 예보로 돌기 때문에
값 자체가 아니라 화면끼리 같은 것을 말하는지를 본다.

화면을 바꾸면 커밋하기 전에 `pnpm test`, `pnpm typecheck`, `pnpm walkthrough`, `pnpm scenarios`를 모두 통과시킨다.
새 상호작용을 만들거나 화면 사이의 버그를 고치면, 그 흐름을 따라 하는 시나리오를 `scripts/scenarios.mjs`에 더한다.
고친 버그의 시나리오는 고치기 전의 코드에서 실패하는지 한 번 확인한다.

## 구조

```
app/
  layout.tsx, globals.css   글꼴(Noto Sans KR), 다크 단일 테마의 색
  page.tsx                  메인 화면
  manifest.ts               웹 앱 매니페스트
  login/, oauth/callback/   로그인 (이전 그대로)
components/
  tonight/                  메인 화면
    tonight-app.tsx         탭, 선택 상태, 설정과 추천을 잇는 곳
    tonight-view.tsx        오늘 밤 추천 (장소 카드, 순위가 붙은 후보 목록, 가볼 만한 곳이 없는 밤)
    hero-card.tsx           장소 하나의 밤 (사진, 추천 시간대, 짧은 설명)
    night-band.tsx          밤 시간 띠
    more-block.tsx, hour-strip.tsx                    자세히 보기
    settings-sheet.tsx, sources-sheet.tsx             설정, 추천 기준과 출처
    my-section.tsx, place-view.tsx, save-place-sheet.tsx   내 장소 묶음, 장소 화면, 저장
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
    night-overlay.ts        광해 지도 자료의 위치와 지도 스타일
    *.test.ts               단위 테스트
  api/, store/              인증과 북마크 클라이언트, zustand 저장소 (이전 그대로)
public/
  sky/                      하늘 사진
  map/                      광해 지도 그림(어두운 하늘, 도시 빛무리, 위성 불빛)
  icons/, sw.js, offline.html   설치용 아이콘, 서비스 워커, 연결이 없을 때의 화면
scripts/
  render_light_layers.py    광해 지도 자료 만들기
  render_icons.py           아이콘 만들기
  walkthrough.mjs           브라우저 점검
  scenarios.mjs             쓰는 흐름 시나리오 점검
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
- 광해 지도는 스팟을 찾는 데 쓰도록 두 가지를 겹친다. 하늘 밝기(백엔드의 `skyglow_korea.bin.gz`, 밤 추천이 장소마다
  읽는 값)로는 어느 지역의 하늘이 어두운지를, 위성 불빛(VIIRS 2024)으로는 그 둘레에 마을이나 도로 불빛이 있는지를 본다.
  하늘 밝기는 양 끝만 칠한다. 어두운 곳은 푸르게(5배 아래, 어두울수록 진하게), 은하수가 안 보이는 10배 이상은 빛무리로.
  숫자는 지도에 적지 않고, 지도를 누르면 고른 자리 카드에 나온다. 푸른빛은 바다 레이어 아래에 깔아 땅에만 보인다.
  자료를 다시 만들려면 다음을 실행한다. `rasterio`가 필요하다. 출력된 범위가 `lib/tonight/night-overlay.ts`와
  다르면 그 좌표도 바꾼다.

  ```bash
  python scripts/render_light_layers.py <백엔드 저장소>/src/main/resources/skyglow/skyglow_korea.bin.gz <vnl2024_korea.tif> public/map
  ```

  `vnl2024_korea.tif`는 백엔드 저장소의 `scripts/lightpollution/crop_radiance.py`가 위성 원본에서 잘라 만든다.

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
- 사진, 광해 지도 이미지, 아이콘은 캐시로 먼저 답하고 뒤에서 새로 받아 둔다.

개발 서버에서는 서비스 워커를 등록하지 않는다.
