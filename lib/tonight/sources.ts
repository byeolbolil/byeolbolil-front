/**
 * "추천 기준과 출처" 화면의 내용. 백엔드 저장소의 `docs/SCORING.md`와 `docs/decisions.md`에 적힌 값과 근거를
 * 사용자가 읽을 말로 옮긴 것이다. 여기서 새 기준을 만들지 않는다. 기준이 바뀌면 그 문서를 먼저 고치고 이 파일을 맞춘다.
 *
 * 상태: 표시 없음은 출처가 있는 값, "정책"은 외부 근거 없이 별볼일이 정한 값, "추정"은 어림한 값,
 * "출처 없음"은 근거를 찾지 못해 바꿀 예정인 값이다.
 */

export type SourceStatus = "정책" | "추정" | "출처 없음"

export interface SourceLink {
  label: string
  url: string
}

export interface SourceEntry {
  title: string
  body: string
  links: SourceLink[]
  status?: SourceStatus
}

export const SOURCES: readonly SourceEntry[] = [
  {
    title: "어두운 시간",
    body: "태양이 지평선 아래 12°보다 낮아지면 대부분의 사람에게 하늘이 어둡게 느껴지고 밝은 별과 별자리가 잘 보여요. 별볼일은 한 시간 내내 태양이 12° 아래에 있는 시간을 어두운 시간으로 세요. 은하수나 성운처럼 희미하게 퍼진 대상은 18° 아래(천문박명이 끝난 뒤)까지 기다려야 해서, 12°와 18° 사이의 시간은 점수를 조금 낮춰요.",
    links: [
      { label: "U.S. Naval Observatory, Rise, Set, and Twilight Definitions", url: "https://aa.usno.navy.mil/faq/RST_defs" },
      { label: "NOAA National Weather Service, Twilight", url: "https://www.weather.gov/fsd/twilight" },
    ],
  },
  {
    title: "맑다고 볼 구름량: 30% 이하",
    body: "Clear Sky Chart는 구름이 30% 이하인 시간만 관측 가능한 시간으로 세요. 별볼일도 같은 기준을 써요.",
    links: [{ label: "Clear Sky Chart, 기후 통계 설명", url: "https://server1.cleardarksky.com/clmt/c/Dallasct.html" }],
  },
  {
    title: '"구름 거의 없음": 20% 미만',
    body: "7Timer!가 구름 20% 미만을 맑음으로 분류해요. 별볼일은 맑은 시간 안에서 '맑음'과 '구름 조금'을 나눠 부를 때만 이 값을 써요.",
    links: [{ label: "7Timer! 문서", url: "https://www.7timer.info/doc.php?lang=en" }],
  },
  {
    title: "예보를 얼마나 믿을 수 있나",
    body: "구름 예보의 오차가 30% 안에 들 확률은 예보 시점이 멀어질수록 73%에서 58%로 떨어지고, 층별(하층, 중층, 상층) 구름은 더 부정확해요. 며칠 뒤의 밤은 참고로만 봐 주세요.",
    links: [{ label: "Ye & Chen, How Good is the Cloud Cover Forecast?, MNRAS 428, 2013", url: "https://arxiv.org/abs/1104.1700" }],
  },
  {
    title: "달빛의 밝기",
    body: "달빛은 빛나는 면적에 비례하지 않아요. 반달은 면적이 절반이지만 밝기는 보름달의 약 9%예요. 위상각으로 보름 대비 밝기를 계산해서 써요.",
    links: [
      { label: "Krisciunas & Schaefer, A Model of the Brightness of Moonlight, PASP 103, 1991", url: "https://doi.org/10.1086/132921" },
    ],
  },
  {
    title: '"달이 밝아요"로 한 단계 낮추는 기준',
    body: "보름 대비 밝기 25% 이상인 달이 추천 시간의 절반 넘게 떠 있으면 등급을 한 단계 내려요. 밝기 계산은 위 논문을 따르지만 25%라는 경계는 별볼일이 정했어요.",
    links: [],
    status: "정책",
  },
  {
    title: "하늘 밝기",
    body: "위성이 잰 밤의 불빛에서, 둘레 300km의 불빛이 하늘 전체를 얼마나 밝히는지를 계산해요. 값은 하늘 전체에서 평균한 인공 불빛이 자연 밤하늘 밝기의 몇 배인지예요. 미국 국립공원관리청 연구진이 전천 카메라 측정으로 맞춘 모형이고, 논문의 측정지 24곳을 같은 계산으로 다시 구해 확인했어요. 위성 자료는 2024년 것이에요.",
    links: [
      {
        label: "Duriscoe et al., A simplified model of all-sky artificial sky glow derived from VIIRS Day/Night band data, JQSRT 214, 2018",
        url: "https://doi.org/10.1016/j.jqsrt.2018.04.028",
      },
      {
        label: "위성 자료: VIIRS Nighttime Lights V2 (Earth Observation Group, Payne Institute for Public Policy, CC BY 4.0), Elvidge et al., Remote Sensing 13, 2021",
        url: "https://eogdata.mines.edu/products/vnl/",
      },
    ],
  },
  {
    title: "하늘의 다섯 등급",
    body: "하늘 밝기 0.33배, 2배, 10배, 50배를 경계로 나눠요. 앞의 세 값은 위 논문의 표이고 10배부터는 은하수가 보이지 않아요. 50배는 눈이 어둠에 적응하지 못한다는 밝기를 옮긴 어림값이에요. 등급의 이름은 별볼일이 붙였어요.",
    links: [
      {
        label: "Falchi et al., The new world atlas of artificial night sky brightness, Science Advances, 2016",
        url: "https://doi.org/10.1126/sciadv.1600377",
      },
    ],
  },
  {
    title: "직접 보이는 불빛",
    body: "산이 가려 주는 것은 하늘에 번진 빛보다 눈으로 곧바로 들어오는 불빛이에요. 명소마다 30m 고도 자료로 그 자리에서 보이는 불빛만 골라 더한 값을 계산해 두고, 많이 보이는 곳은 순위를 낮추고 알려 줘요. 어디부터 많다고 볼지는 다녀온 사람의 관찰 세 건에 맞춘 값이에요. 주차장 가로등 같은 현장의 조명은 위성 자료에 없어서 반영하지 못해요.",
    links: [
      {
        label: "Cinzano & Falchi, The propagation of light pollution in the atmosphere, MNRAS 427, 2012",
        url: "https://arxiv.org/abs/1209.2031",
      },
      {
        label: "고도 자료: Copernicus DEM GLO-30 (© DLR e.V. 2010-2014, © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA)",
        url: "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM",
      },
    ],
    status: "정책",
  },
  {
    title: "습도와 이슬: 80% 이상이면 주의",
    body: "7Timer!는 습도 80%, 90%, 95%에서 단계별로 경고해요. 별볼일은 추천 시간의 습도가 80% 이상이면 이슬 주의를 띄워요. 망원경이나 렌즈는 공기보다 차가워져서 이슬점에 닿기 전에도 이슬이 맺힐 수 있어요.",
    links: [
      { label: "7Timer! 문서", url: "https://www.7timer.info/doc.php?lang=en" },
      {
        label: "Celestron, Dew point and astronomy",
        url: "https://www.celestron.com/blogs/knowledgebase/what-is-the-dew-point-and-why-does-it-matter-for-astronomy",
      },
    ],
  },
  {
    title: "눈이 어둠에 익는 시간",
    body: "어둠에 들어가면 5~8분 뒤 눈의 감도가 크게 바뀌고, 완전히 적응하는 데 40분쯤 걸려요.",
    links: [
      {
        label: "Kalloniatis & Luu, Light and Dark Adaptation, Webvision",
        url: "https://www.webvision.pitt.edu/book/part-viii-psychophysics-of-vision/light-and-dark-adaptation/",
      },
    ],
  },
  {
    title: '3시간 이상 맑으면 "별 보기 아주 좋아요"',
    body: "맑은 시간 몇 시간 이상을 추천 기준으로 쓰는 서비스나 근거는 찾지 못했어요. 눈이 적응하는 40분쯤을 빼고도 2시간 넘게 볼 수 있도록 별볼일이 정한 값이고, 설정에서 바꿀 수 있어요.",
    links: [],
    status: "정책",
  },
  {
    title: '2시간 이상 맑으면 "별 보기 좋아요"',
    body: "추천 시간이 2시간보다 짧으면 \"별 보기 아쉬워요\"로 낮춰요. 별볼일이 정한 값이에요.",
    links: [],
    status: "정책",
  },
  {
    title: "새벽 2시 전 선호",
    body: "입문자가 무리 없이 다녀올 수 있는 시간대로 정한 값이에요. 이 시각 뒤의 맑은 시간은 절반으로 쳐서 추천 시간을 골라요. 설정에서 바꿀 수 있어요.",
    links: [],
    status: "정책",
  },
  {
    title: '도시 하늘은 "별 보기 아쉬워요"까지',
    body: "은하수가 보이지 않는 하늘(인공 불빛이 자연의 10배 이상)은 맑은 밤이어도 \"별 보기 아쉬워요\"까지만 줘요. 하늘 밝기만으로는 작은 도시의 시내가 걸러지지 않아서, 서 있는 곳 둘레 1km가 밝은 곳도 같이 낮춰요. 둘레가 밝다고 보는 경계는 별볼일이 정했어요.",
    links: [],
    status: "정책",
  },
  {
    title: "시간별 점수 계산식",
    body: "어두운 시간마다 100점에서 시작해 구름, 하늘 밝기, 직접 보이는 불빛, 달, 박명이 남기는 비율을 차례로 곱해요. 곱으로 묶은 것은 광해가 심한 곳에서 달의 영향이 줄어든다는 관측과 맞지만, 하늘 밝기 0.5, 달 0.3, 박명과 직접 보이는 불빛 0.2라는 가중치에는 근거 자료가 없어서 별볼일이 정했어요. 점수는 등급을 정하지 않고, 맑은 구간이 여럿일 때 어느 쪽을 추천할지와 같은 등급 안의 순서에만 써요.",
    links: [{ label: "Puschnig, Wallner & Posch, MNRAS, 2020", url: "https://arxiv.org/abs/1912.05673" }],
    status: "정책",
  },
  {
    title: "이동 시간",
    body: "직선거리의 1.3배를 시속 60km로 간다고 보고 어림한 값이에요. 산길을 올라가는 명소는 실제로 더 걸려요. 등급이 같은 장소끼리는 이동 1시간마다 4점을 빼서 가까운 곳을 앞에 둬요.",
    links: [],
    status: "추정",
  },
  {
    title: '"오늘 밤"이 가리키는 날',
    body: "새벽 4시 전에는 지난 저녁에 시작한 밤을 오늘 밤으로 봐요. 자정을 넘겨 앱을 열어도 지금 보고 있는 밤이 나오게 하려고 정한 값이에요.",
    links: [],
    status: "정책",
  },
  {
    title: "날씨 예보",
    body: "시간별 구름과 습도는 Open-Meteo에서 ECMWF IFS 모델의 예보를 받아요. Open-Meteo를 쓸 수 없을 때는 노르웨이 기상청(MET Norway)의 예보로 대신하고, 어느 쪽을 썼는지 화면에 적어요. 두 자료 모두 CC BY 4.0으로 공개돼 있어요.",
    links: [
      { label: "Open-Meteo", url: "https://open-meteo.com/" },
      { label: "MET Norway Locationforecast", url: "https://api.met.no/weatherapi/locationforecast/2.0/documentation" },
    ],
  },
  {
    title: "추천하는 장소",
    body: "기본 후보는 밤에 누구나 가서 맨눈으로 볼 수 있다고 확인한 관측지 24곳이에요. 공식 안내와 기사, 관측 후기를 찾아 읽고 골랐고, 현장에 가 보지는 못했어요. 천문대와 과학관은 예약한 프로그램으로 망원경을 보는 곳이라 추천 순위에 넣지 않고 따로 모았어요. 장소의 위치는 그곳에서 차를 대는 주차장이나 전망대이고, OpenStreetMap과 위키백과에서 확인한 좌표예요. 자리를 지도에서 특정하지 못한 몇 곳은 대략의 위치이고, 장소 소개에 그렇게 적었어요. 더 알아보기의 글과 그 옆의 작은 그림은 다른 사람이 쓰고 올린 것이라 사라지거나 내용이 달라질 수 있어요. 겨울 폐쇄나 통제는 해마다 달라지니 가기 전에 확인해 주세요.",
    links: [{ label: "© OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright" }],
  },
  {
    title: "지도",
    body: "광해 지도는 위성이 잰 야간광(VIIRS) 값으로 별볼일이 직접 그렸어요. 어디가 밝은지 보여주는 그림이고 등급을 정하는 데는 쓰지 않아요. 바탕 지도는 OpenStreetMap 자료로 만든 OpenFreeMap의 지도예요. 구름 레이어는 구름의 모양을 그리지 않고, 고른 시각에 각 장소의 예보 구름량만 색으로 보여줘요.",
    links: [
      { label: "VIIRS Nighttime Lights 2024, Earth Observation Group, Payne Institute", url: "https://eogdata.mines.edu/products/vnl/" },
      { label: "OpenFreeMap", url: "https://openfreemap.org/" },
      { label: "OpenMapTiles", url: "https://www.openmaptiles.org/" },
      { label: "OpenStreetMap 저작권 안내", url: "https://www.openstreetmap.org/copyright" },
    ],
  },
  {
    title: "사진과 그림",
    body: "장소 사진은 위키미디어 공용에서 재사용이 허락된 것만 골라 썼고, 사진마다 작가와 라이선스를 사진 위에 적었어요. 크기만 줄였고 자르거나 보정하지 않았어요. 그 장소가 어떤 곳인지 보여주려는 사진이라 대부분 낮에 찍은 풍경이에요. 사진을 구하지 못한 장소는 다른 곳의 사진을 빌려 쓰지 않고, 오늘 밤 예보(구름, 달, 광해 등급)로 그린 하늘 그림을 보여줘요. 그림 속 별의 수는 느낌을 전하려는 것이고 실제로 보이는 별의 수를 계산한 것은 아니에요.",
    links: [
      { label: "위키미디어 공용", url: "https://commons.wikimedia.org/" },
      {
        label: '"Night Clouds", BLM Oregon and Washington, 퍼블릭 도메인 (가볼 만한 곳이 없는 밤의 사진)',
        url: "https://commons.wikimedia.org/wiki/File:Night_Clouds_(11424694453).jpg",
      },
    ],
  },
  {
    title: "지도의 구름",
    body: "구름 레이어는 한국과 주변 바다를 약 40km 간격으로 나눈 격자의 구름 예보를 이어 그린 그림이에요. 구름의 실제 모양이 아니라 어느 쪽이 흐리고 밤사이 구름대가 어디로 가는지를 보여줘요. 장소가 맑은지는 이 그림이 아니라 장소마다 따로 받은 예보로 판단해서, 둘이 조금 어긋날 수 있어요. 구름량 20% 아래는 그리지 않아요.",
    links: [
      { label: "Open-Meteo (ECMWF IFS), CC BY 4.0", url: "https://open-meteo.com/" },
      { label: "7Timer! 문서", url: "https://www.7timer.info/doc.php?lang=en" },
    ],
  },
  {
    title: "지명 검색",
    body: "장소 이름과 행정구역은 OpenStreetMap에 올라온 것을 Photon으로 찾아요. OpenStreetMap에 없는 이름은 나오지 않아요. 그럴 때는 지도에서 직접 위치를 눌러 골라 주세요.",
    links: [
      { label: "© OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright" },
      { label: "Photon", url: "https://photon.komoot.io/" },
    ],
  },
]
