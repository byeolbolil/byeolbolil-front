import { AlertIcon, CarIcon, ClockIcon } from "./icons"

interface PlaceAboutProps {
  /** 어떤 곳인지 한두 문장 */
  description?: string
  /** 가는 법과 주차. 시설이면 운영 시간과 예약 방법 */
  guide?: string
  /** 계절 폐쇄, 조명, 통제 같은 주의 사항 */
  caution?: string
  /** 시설이면 안내 줄이 가는 법이 아니라 운영 시간과 예약 방법이다 */
  facility?: boolean
}

/**
 * 장소 소개. 무엇으로 알려진 곳인지, 어디에 차를 대는지, 가기 전에 알아 둘 것을 적는다.
 * 직접 저장한 내 장소처럼 적어 둔 내용이 없으면 아무것도 그리지 않는다.
 */
export function PlaceAbout({ description, guide, caution, facility = false }: PlaceAboutProps) {
  if (!description && !guide && !caution) return null
  return (
    <div className="about">
      {description ? <p className="about-desc">{description}</p> : null}
      {guide || caution ? (
        <ul className="about-list">
          {guide ? (
            <li>
              {facility ? <ClockIcon /> : <CarIcon />}
              <div>
                <b>{facility ? "이용 안내" : "가는 법"}</b>
                <span>{guide}</span>
              </div>
            </li>
          ) : null}
          {caution ? (
            <li data-kind="caution">
              <AlertIcon />
              <div>
                <b>미리 알아두세요</b>
                <span>{caution}</span>
              </div>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
