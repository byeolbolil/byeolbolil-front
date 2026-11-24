import { levelStars, levelText } from "@/lib/tonight/wording"
import type { RecommendationLevel } from "@/lib/tonight/types"
import { CloudIcon, StarIcon } from "./icons"

interface RatingProps {
  level: RecommendationLevel
  /** 목록에서는 별만 보여주고 문구는 뺀다 */
  compact?: boolean
}

/** 추천 등급. 별 1~3개와 문구로 보여주고, 쉬어가는 밤은 별 대신 구름이다. */
export function Rating({ level, compact = false }: RatingProps) {
  const stars = levelStars(level)
  const text = levelText(level)
  if (stars === 0) {
    return (
      <span className="rating cloudy" title={text}>
        <CloudIcon />
        {compact ? "흐림" : text}
      </span>
    )
  }
  return (
    <span className="rating" title={text}>
      <span className="stars" role="img" aria-label={`별 ${stars}개, ${text}`}>
        {[0, 1, 2].map((index) => (
          <StarIcon key={index} filled={index < stars} />
        ))}
      </span>
      {compact ? null : text}
    </span>
  )
}
