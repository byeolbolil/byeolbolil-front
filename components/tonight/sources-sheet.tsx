"use client"

import { SOURCES } from "@/lib/tonight/sources"
import { Sheet } from "./sheet"

/** 추천 기준과 출처. 기준값마다 근거와 상태를 보여주고, 근거를 찾지 못한 값은 그렇다고 적는다. */
export function SourcesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="추천 기준과 출처" onClose={onClose}>
      <p className="sheet-note">별볼일이 쓰는 기준값과 그 근거예요. 근거를 찾지 못한 값은 그렇다고 표시해요.</p>
      <ul className="src">
        {SOURCES.map((entry) => (
          <li key={entry.title}>
            <b>
              {entry.title}
              {entry.status ? <span className="tag">{entry.status}</span> : null}
            </b>
            {entry.body}
            {entry.links.map((link) => (
              <a key={link.url + link.label} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
