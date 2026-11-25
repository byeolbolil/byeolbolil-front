/**
 * 화면의 설명 문구와 그래프에 적는 서버 쪽 기준값.
 *
 * 판정은 모두 서버(`NightAssessmentEngine`)가 하고, 클라이언트는 결과만 받는다. 아래 값은 "왜 이 등급인지"를 설명하는
 * 문구에 넣으려고 옮겨 적은 것이라, 서버 값이 바뀌면 함께 고쳐야 한다. 근거는 백엔드 저장소 `docs/SCORING.md`에 있다.
 */

/** 맑은 시간으로 세는 구름량의 상한(%). Clear Sky Chart 기후 통계가 구름 30% 이하인 시간만 관측 가능 시간으로 센다. */
export const CLEAR_CLOUD_COVER_MAX = 30

/**
 * 하늘 밝기(인공 불빛이 자연 밤하늘의 몇 배인지)가 이 값 이상이면 은하수가 보이지 않아 "별 보기 아쉬워요"까지만 준다.
 * Duriscoe et al., JQSRT 214, 133 (2018) 표 3.
 */
export const MILKY_WAY_LOST_SKY = 10
