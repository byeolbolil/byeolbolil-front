import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "이용약관 · 별볼일",
  description: "별볼일을 쓰는 규칙과 예보 정보의 한계",
}

// 백엔드 저장소 docs/decisions.md 2026-11-28 "가입할 때 약관 동의를 받는다"에서 이 페이지를 두기로 했다.
// 내용을 바꾸면 시행일과 백엔드의 Member.TERMS_VERSION을 같이 고친다.
const EFFECTIVE_DATE = "2026년 11월 28일"
const CONTACT = "contact@byeolbolil.com"

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-sm leading-relaxed text-muted-foreground">
      <Link href="/" className="text-xs underline underline-offset-4">
        별볼일로 돌아가기
      </Link>
      <h1 className="mt-4 text-xl font-bold text-foreground">이용약관</h1>
      <p className="mt-2">
        별볼일(www.byeolbolil.com)은 별 보기 좋은 곳과 시간을 알려 주는 무료 서비스이고, 유승우가 개인으로 운영합니다. 이
        약관은 별볼일을 쓰는 사람과 운영자 사이의 규칙을 정합니다. 시행일은 {EFFECTIVE_DATE}입니다.
      </p>

      <div className="mt-8 space-y-8">
        <Section title="1. 서비스">
          <p>
            날씨 예보, 하늘의 밝기, 해와 달의 위치를 바탕으로 장소마다 오늘 밤과 앞으로 일주일 동안 별 보기 좋은 시간을
            알려 줍니다. 로그인하지 않아도 쓸 수 있고, 가입하면 장소를 저장하고 저장한 곳의 밤을 모아 볼 수 있습니다.
            서비스는 무료이고 광고를 붙이지 않습니다.
          </p>
        </Section>

        <Section title="2. 예보와 추천의 한계">
          <p>
            별볼일이 보여 주는 날씨, 구름, 하늘 밝기, 추천 순위, 이동 시간, 도로 통제 기간은 공개된 예보와 자료로 계산한
            참고 정보입니다. 예보는 틀릴 수 있고 현장의 날씨는 빠르게 바뀝니다. 장소의 출입 가능 여부, 주차, 도로 사정도
            실제와 다를 수 있습니다. 운영자는 이 정보가 정확하거나 빠짐없다고 보장하지 않습니다. 길을 나서기 전에 기상청
            예보와 현지 안내를 함께 확인해 주세요.
          </p>
          <p>
            예보와 지도 같은 자료는 각 제공자의 것이고, 출처는 화면의 &ldquo;추천 기준과 출처&rdquo;에 적어 둡니다.
          </p>
        </Section>

        <Section title="3. 현장에서의 안전">
          <p>
            추천하는 곳은 대개 밤에 불빛이 적은 산과 들입니다. 어두운 산길 운전, 낭떠러지와 물가, 추위, 야생동물에 스스로
            주의해야 합니다. 사유지와 출입이 막힌 곳에 들어가지 말고, 국립공원과 자연휴양림처럼 밤에 출입 규칙이 있는 곳은
            그 규칙을 따라 주세요. 현장에서의 판단과 안전은 이용자의 몫입니다.
          </p>
        </Section>

        <Section title="4. 가입과 계정">
          <ul className="list-disc space-y-1 pl-5">
            <li>만 14세 이상만 가입할 수 있습니다.</li>
            <li>이메일로 가입하거나 카카오, 네이버, Google 계정으로 가입할 수 있습니다.</li>
            <li>자기 이메일과 계정으로만 가입해야 합니다. 비밀번호는 스스로 관리하고 다른 사람과 나누지 않습니다.</li>
            <li>
              가입하며 받는 정보와 그 처리 방법은 <Link href="/privacy" className="underline underline-offset-4">개인정보처리방침</Link>
              에 따릅니다.
            </li>
          </ul>
        </Section>

        <Section title="5. 하지 말아야 할 것">
          <ul className="list-disc space-y-1 pl-5">
            <li>프로그램으로 많은 요청을 보내 자료를 긁어 가거나 서버에 부담을 주는 일</li>
            <li>서비스의 보안을 우회하거나 다른 사람의 계정에 들어가려는 일</li>
            <li>다른 사람의 이메일이나 개인정보를 써서 가입하는 일</li>
            <li>별볼일을 써서 법을 어기는 일</li>
          </ul>
        </Section>

        <Section title="6. 탈퇴와 이용 제한">
          <p>
            언제든 화면 위의 계정 메뉴에서 탈퇴할 수 있고, 탈퇴하면 회원 정보와 저장한 장소를 바로 지웁니다. 5에 적은 일을 하면
            운영자가 그 계정의 이용을 막거나 지울 수 있습니다. 이때는 가입한 이메일로 먼저 알리고, 서비스를 지키려고 바로
            막아야 했다면 막은 뒤에 알립니다.
          </p>
        </Section>

        <Section title="7. 서비스의 변경과 중단">
          <p>
            개인이 운영하는 무료 서비스라서 기능을 바꾸거나 서비스를 멈출 수 있습니다. 서비스를 끝낼 때는 30일 전에 이
            사이트에 알리고, 그동안 회원 정보는 계속 탈퇴로 지울 수 있게 둡니다. 서버 점검이나 장애로 잠시 쓸 수 없는 때도
            있습니다.
          </p>
        </Section>

        <Section title="8. 책임의 한계">
          <p>
            별볼일은 무료로 참고 정보를 주는 서비스입니다. 예보가 틀렸거나 서비스를 잠시 쓸 수 없어서, 또는 현장에서 생긴
            일로 이용자가 입은 손해에 대해 운영자는 책임을 지지 않습니다. 다만 운영자의 고의나 중대한 과실로 생긴 손해는
            그렇지 않습니다.
          </p>
        </Section>

        <Section title="9. 약관의 변경">
          <p>
            약관을 바꾸면 시행 7일 전에 이 페이지에 바뀐 내용과 시행일을 알립니다. 이용자에게 불리하게 바뀌면 30일 전에
            알립니다. 바뀐 약관에 동의하지 않으면 탈퇴할 수 있습니다.
          </p>
        </Section>

        <Section title="10. 문의와 분쟁">
          <p>
            문의는 <a href={`mailto:${CONTACT}`} className="underline underline-offset-4">{CONTACT}</a>로 보내 주세요. 이
            약관은 대한민국 법을 따르고, 분쟁은 민사소송법이 정한 법원에서 다룹니다.
          </p>
        </Section>
      </div>
    </main>
  )
}
