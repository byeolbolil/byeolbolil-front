"use client"

import { useState } from "react"
import { Sheet } from "./sheet"

type Phone = "galaxy" | "iphone"

/** 휴대폰마다 다른 설정. 값은 예전 촬영 가이드 페이지에서 옮겼다 */
const PHONES: Record<Phone, { label: string; steps: string[]; settings: Array<[string, string]>; note: string }> = {
  galaxy: {
    label: "갤럭시",
    steps: ["카메라 앱에서 더보기 → Expert RAW", "위쪽의 천체 사진을 켜요", "삼각대에 세우고 찍어요. 몇 분 동안 여러 장을 찍어 합쳐요"],
    settings: [
      ["ISO", "800 ~ 3200"],
      ["셔터", "10 ~ 20초"],
      ["초점", "수동, 무한대(∞)"],
      ["화이트밸런스", "3800 ~ 4500K"],
      ["파일", "RAW"],
    ],
    note: "천체 사진 모드가 없는 기종은 프로 모드에서 위 값으로 찍어요. 셔터를 20초 넘게 열면 별이 길게 늘어나요.",
  },
  iphone: {
    label: "아이폰",
    steps: ["어두운 곳에서 카메라를 켜면 야간 모드가 저절로 켜져요", "위쪽의 야간 모드 아이콘을 눌러 노출을 가장 길게", "삼각대에 세우고 찍어요. 손으로 들면 10초까지만 돼요"],
    settings: [
      ["노출", "최대 30초 (삼각대)"],
      ["앱", "Halide, ProCamera, NightCap"],
      ["앱 설정", "ISO 1600 ~ 3200, 15 ~ 30초, 초점 무한대, RAW"],
    ],
    note: "기본 카메라로도 충분히 찍혀요. 더 다듬고 싶을 때 앱을 써요.",
  },
}

/** 휴대폰으로 별 사진 찍기. 기종을 골라 그 기종의 순서와 설정만 보여 준다 */
export function GuideSheet({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState<Phone>("galaxy")
  const guide = PHONES[phone]
  return (
    <Sheet title="별 사진 찍기" onClose={onClose}>
      <div className="guide">
        <section>
          <h3>챙길 것</h3>
          <ul className="guide-list">
            <li>삼각대. 없으면 바닥에 휴대폰을 세워 둬도 돼요</li>
            <li>2~10초 타이머. 누르는 손이 흔들림을 만들어요</li>
            <li>휴대폰 케이스는 빼요. 렌즈 가장자리를 가릴 수 있어요</li>
          </ul>
        </section>
        <section>
          <div className="seg" role="group" aria-label="휴대폰">
            {(Object.keys(PHONES) as Phone[]).map((value) => (
              <button key={value} type="button" aria-pressed={phone === value} onClick={() => setPhone(value)}>
                {PHONES[value].label}
              </button>
            ))}
          </div>
          <ol className="guide-steps">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <dl className="guide-table">
            {guide.settings.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="guide-note">{guide.note}</p>
        </section>
        <section>
          <h3>찍고 나서</h3>
          <p className="guide-note">
            Lightroom이나 Snapseed에서 노출과 대비를 조금 올리고, 밝은 곳은 낮추고 어두운 곳은 올려요. 노이즈 감소는 약하게,
            색온도는 조금 차갑게 하면 하늘이 맑아 보여요.
          </p>
        </section>
        <section>
          <h3>자주 하는 실수</h3>
          <ul className="guide-list">
            <li>자동 초점에 맡기기. 별에는 초점이 잘 안 잡혀요</li>
            <li>렌즈의 손자국과 김. 찍기 전에 한 번 닦아요</li>
            <li>달이 밝은 밤. 은하수는 달 없는 밤에 찍어요</li>
          </ul>
        </section>
      </div>
    </Sheet>
  )
}
