import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "개인정보처리방침 · 별볼일",
  description: "별볼일이 받는 개인정보와 그 처리 방법",
}

// 백엔드 저장소 docs/decisions.md 2026-11-28 "도메인을 byeolbolil.com으로 옮긴다"에서 이 페이지를 두기로 했다.
// 받는 항목이나 맡기는 곳이 바뀌면 이 페이지와 시행일을 같이 고친다.
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

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-sm leading-relaxed text-muted-foreground">
      <Link href="/" className="text-xs underline underline-offset-4">
        별볼일로 돌아가기
      </Link>
      <h1 className="mt-4 text-xl font-bold text-foreground">개인정보처리방침</h1>
      <p className="mt-2">
        별볼일(www.byeolbolil.com)은 별 보기 좋은 곳과 시간을 알려 주는 개인 운영 서비스입니다. 로그인하지 않아도 쓸 수
        있고, 로그인은 장소를 저장할 때만 필요합니다. 이 방침은 {EFFECTIVE_DATE}부터 적용합니다.
      </p>

      <div className="mt-8 space-y-8">
        <Section title="1. 받는 정보와 쓰는 곳">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              회원 정보: 이메일, 로그인에 쓴 서비스(카카오, 네이버, Google)와 그 서비스가 주는 회원 식별값, 닉네임.
              이메일로 가입하면 비밀번호를 되돌릴 수 없는 형태(BCrypt 해시)로 저장합니다. 로그인과 회원 구분에만 씁니다.
            </li>
            <li>
              인증 코드: 이메일로 가입할 때 메일을 받을 수 있는 주소인지 확인하려고, 비밀번호를 잊었을 때 본인인지 확인하려고
              여섯 자리 코드를 보냅니다. 코드는 10분 뒤에, 그 주소로 코드를 보낸 횟수는 이틀 뒤에 지웁니다.
            </li>
            <li>
              로그인 실패 횟수: 남이 비밀번호를 계속 넣어 보지 못하게 이메일마다 틀린 횟수를 셉니다. 처음 틀린 때부터 15분,
              다섯 번 틀려 로그인을 막았다면 막은 때부터 15분 뒤에 지웁니다.
            </li>
            <li>
              약관 동의 기록: 가입할 때 동의한 <Link href="/terms" className="underline underline-offset-4">이용약관</Link>의
              시행일과 동의한 시각. 회원 정보와 함께 보관합니다.
            </li>
            <li>
              저장한 장소: 장소 이름, 좌표, 주소, 메모. 저장한 장소의 날씨와 추천을 보여 주는 데에만 씁니다.
            </li>
            <li>
              현재 위치: 위치 사용을 허락하면 가까운 곳과 이동 시간을 계산하려고 좌표를 서버에 보냅니다. 계정과 묶어
              저장하지 않습니다.
            </li>
            <li>
              방문 통계: 호스팅 업체(Vercel)의 통계 도구가 쿠키 없이 페이지 방문 수를 셉니다. 개인을 알아볼 수 없는
              합계만 봅니다.
            </li>
          </ul>
          <p>
            소셜 로그인 서비스가 이메일과 함께 이름이나 프로필 닉네임을 보내지만 저장하지 않습니다. 전화번호와 프로필
            사진도 저장하지 않습니다. 만 14세 미만의 가입은 받지 않습니다.
          </p>
        </Section>

        <Section title="2. 보관 기간과 지우는 방법">
          <p>
            회원 정보와 저장한 장소는 탈퇴할 때까지 보관합니다. 화면 위의 계정 메뉴에서 탈퇴하면 그 자리에서 회원 정보와
            저장한 장소를 모두 지웁니다. 소셜 로그인으로 가입했다면 그 서비스에 한 번 더 로그인해 본인임을 확인하고, 그
            서비스와 별볼일의 연결도 함께 끊습니다. 지운 정보는 되살릴 수 없게 데이터베이스에서 삭제합니다. 앱에서 탈퇴할
            수 없을 때는 {CONTACT}로 가입한 이메일에서 요청하면 10일 안에 지우고 답장합니다.
          </p>
          <p>
            서버는 요청마다 접속 기록을 따로 남기지 않습니다. 오류 기록은 용량이 차면(서비스마다 10MB) 오래된 것부터
            지워집니다.
          </p>
        </Section>

        <Section title="3. 다른 곳에 주거나 맡기는 정보">
          <p>받은 개인정보를 다른 사람이나 회사에 팔거나 주지 않습니다. 서비스를 돌리려고 아래 업체에 처리를 맡깁니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Oracle Cloud(한국 춘천 리전): 서버와 데이터베이스. 회원 정보와 저장한 장소가 여기에 있습니다.</li>
            <li>Vercel Inc.(미국): 웹 화면 호스팅과 방문 통계.</li>
            <li>Cloudflare, Inc.(미국): 도메인 연결과 {CONTACT}로 오는 메일 전달.</li>
            <li>Resend, Inc.(미국, 발송 서버는 일본 도쿄): 인증 메일 발송. 받는 이메일 주소와 메일 내용을 보냅니다.</li>
            <li>카카오: 지도 표시. 지도를 그릴 때 브라우저가 카카오 서버에 직접 요청합니다.</li>
          </ul>
          <p>
            Vercel, Cloudflare, Resend는 해외 회사라서, 화면을 열 때의 접속 정보(IP 주소, 브라우저 정보), 문의 메일, 가입
            인증 메일의 받는 주소가 미국과 일본을 포함한 해외 서버를 거칩니다. 서비스를 쓰는 동안 네트워크로 전송되며 각 업체의 정책에 따라 보관됩니다. 이를
            원하지 않으면 서비스를 쓰지 않는 것 말고는 막을 방법이 없습니다.
          </p>
        </Section>

        <Section title="4. 쿠키와 브라우저 저장소">
          <p>
            로그인을 14일 동안 유지하려고 <code>refresh_token</code> 쿠키를 씁니다. 화면 스크립트가 읽을 수 없는
            쿠키이고, 로그아웃하면 지웁니다. 추천 설정과 화면 상태는 브라우저 저장소에만 두고 서버로 보내지 않습니다.
          </p>
        </Section>

        <Section title="5. 이용자의 권리">
          <p>
            자기 개인정보를 보거나 고치거나 지우거나 처리를 멈추도록 요청할 수 있습니다. 닉네임과 저장한 장소는 앱에서
            직접 고칠 수 있고, 나머지는 {CONTACT}로 요청하면 10일 안에 처리합니다.
          </p>
        </Section>

        <Section title="6. 안전하게 지키는 방법">
          <p>
            모든 통신은 HTTPS로 암호화합니다. 비밀번호는 해시로만 저장합니다. 서버와 데이터베이스에는 운영자 한 명만
            접근할 수 있습니다.
          </p>
        </Section>

        <Section title="7. 개인정보 보호책임자">
          <p>
            유승우 · <a href={`mailto:${CONTACT}`} className="underline underline-offset-4">{CONTACT}</a>
          </p>
          <p>개인정보 침해에 대한 상담이나 신고는 아래 기관에도 할 수 있습니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>개인정보침해신고센터: privacy.kisa.or.kr, 국번 없이 118</li>
            <li>개인정보분쟁조정위원회: www.kopico.go.kr, 1833-6972</li>
            <li>대검찰청: www.spo.go.kr, 국번 없이 1301</li>
            <li>경찰청: ecrm.police.go.kr, 국번 없이 182</li>
          </ul>
        </Section>

        <Section title="8. 바뀔 때">
          <p>이 방침을 바꾸면 이 페이지에 시행일과 함께 알립니다.</p>
        </Section>
      </div>
    </main>
  )
}
