import { forecastCredits } from "@/lib/tonight/facts"
import { issuedAtText } from "@/lib/tonight/time"
import type { ForecastSource, NightPlace } from "@/lib/tonight/types"
import { forecastSourceName } from "@/lib/tonight/wording"

const SOURCE_URL: Record<ForecastSource, string> = {
  OPEN_METEO: "https://open-meteo.com/",
  MET_NORWAY: "https://api.met.no/",
}

/**
 * 예보 출처 표기. Open-Meteo와 MET Norway의 자료는 CC BY 4.0이라 화면에 출처를 적어야 한다
 * (백엔드 저장소 docs/decisions.md "날씨 예보를 Open-Meteo로 전환").
 */
export function ForecastCredit({ places }: { places: readonly NightPlace[] }) {
  const credits = forecastCredits(places)
  if (credits.length === 0) return null
  return (
    <p className="credit-line">
      날씨 예보:{" "}
      {credits.map((credit, index) => (
        <span key={credit.source}>
          {index > 0 ? ", " : ""}
          <a href={SOURCE_URL[credit.source]} target="_blank" rel="noopener noreferrer">
            {forecastSourceName(credit.source)}
          </a>
          {credit.issuedAt ? ` (${issuedAtText(credit.issuedAt)} 생성)` : ""}
        </span>
      ))}
      , CC BY 4.0
    </p>
  )
}
