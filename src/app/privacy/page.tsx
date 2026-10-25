import Link from "next/link";
import { PRIVACY as P } from "@/config/privacy";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { PrivacyTabs } from "./PrivacyTabs";

// 개인정보 처리방침 (「개인정보 보호법」 제30조, 개인정보보호위원회 「개인정보 처리방침 작성지침」 2026.4.)
// 로그인하지 않아도 볼 수 있어야 해서 공개 주소(/privacy)이고, 로그인 화면 아래에 링크가 있어요.

export const metadata = { title: `${P.service} 개인정보 처리방침` };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="mb-2 mt-6 border-b-2 border-navy-900 pb-1 text-heading font-bold">□ {title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

const th = "border border-win-shadow bg-win-gray px-2 py-1 text-left";
const td = "border border-win-shadow px-2 py-1 align-top";

const TOC = [
  ["purpose", "1. 개인정보의 처리 목적"],
  ["items", "2. 처리하는 개인정보의 항목"],
  ["child", "3. 14세 미만 아동의 개인정보 처리"],
  ["period", "4. 개인정보의 처리 및 보유 기간"],
  ["destroy", "5. 개인정보의 파기 절차 및 방법"],
  ["third", "6. 개인정보의 제3자 제공"],
  ["consign", "7. 개인정보 처리업무의 위탁"],
  ["abroad", "8. 개인정보의 국외 이전"],
  ["safety", "9. 개인정보의 안전성 확보조치"],
  ["auto", "10. 자동 수집 장치(쿠키)의 설치·운영 및 거부"],
  ["decision", "11. 자동화된 결정"],
  ["rights", "12. 정보주체와 법정대리인의 권리·의무 및 행사방법"],
  ["officer", "13. 개인정보 보호책임자"],
  ["remedy", "14. 권익침해 구제방법"],
  ["change", "15. 개인정보 처리방침의 변경"],
] as const;

function FullPolicy() {
  return (
    <div className="font-sans text-body leading-7 text-navy-900">
      <p>
        <strong>{P.operator}</strong>({P.service}, 이하 &lsquo;서비스&rsquo;)은(는) 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계
        법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다. 이에 「개인정보 보호법」 제30조에 따라
        정보주체에게 개인정보의 처리와 보호에 관한 절차 및 기준을 안내하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록
        다음과 같이 개인정보 처리방침을 수립·공개합니다.
      </p>

      <nav className="my-4 grid gap-1 border-3 border-navy-900 bg-paper p-3 text-small md:grid-cols-2" aria-label="목차">
        {TOC.map(([id, t]) => (
          <a key={id} href={`#${id}`} className="underline underline-offset-4">
            {t}
          </a>
        ))}
      </nav>

      <Section id="purpose" title="1. 개인정보의 처리 목적">
        <p>서비스는 다음 목적을 위하여 개인정보를 처리하며, 다음 목적 외의 용도로는 이용하지 않습니다. 이용 목적이 바뀌는 경우에는 「개인정보 보호법」 제18조에 따라 필요한 조치를 하겠습니다.</p>
        <ol className="list-decimal pl-6">
          <li>
            <strong>수업 운영과 이용자 확인</strong>: 정보 교과 수업에서의 타자 연습 제공, 학생 본인 확인(학번·그림 비밀번호 로그인), 학급별
            학생 관리
          </li>
          <li>
            <strong>학습 기록 관리와 피드백</strong>: 타자 연습·게임 기록 저장, 성장 점수·단계(티어) 계산, 자주 틀리는 키 안내, 교사의 학습 지도
          </li>
          <li>
            <strong>부정 이용 방지</strong>: 비정상적인 속도·입력 패턴의 기록 확인, 로그인 비밀번호 반복 실패 시 잠금
          </li>
          <li>
            <strong>친구 대결</strong>: 같은 반 학생끼리 실시간 레이스 진행(닉네임·진행률 표시)
          </li>
        </ol>
      </Section>

      <Section id="items" title="2. 처리하는 개인정보의 항목">
        <p>
          서비스는 처리 목적에 필요한 최소한의 개인정보만 처리합니다. 처리의 법적 근거: <strong>{P.legalBasis}</strong>
          {P.guardianConsent && " 및 보호자(법정대리인)의 동의"}
        </p>
        <table className="w-full border-collapse text-small">
          <thead>
            <tr>
              <th className={th}>구분</th>
              <th className={th}>처리 항목</th>
              <th className={th}>수집 방법</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={td}>학생 계정</td>
              <td className={td}>이름(실명), 학년·반·번호(학번), 닉네임, 그림 비밀번호(복원할 수 없게 변환하여 저장)</td>
              <td className={td}>교사가 학급 명단 등록, 학생이 닉네임·그림 비밀번호 직접 설정</td>
            </tr>
            <tr>
              <td className={td}>학습 기록</td>
              <td className={td}>
                연습·미션·게임 기록(트랙, 단계, 타수, 정확도, 걸린 시간, 자주 틀린 키), 배치 테스트 결과, 성장 점수, 코인 내역, 이상 기록 여부
              </td>
              <td className={td}>서비스 이용 과정에서 생성</td>
            </tr>
            <tr>
              <td className={td}>보안 기록</td>
              <td className={td}>로그인 실패 시각</td>
              <td className={td}>서비스 이용 과정에서 생성</td>
            </tr>
            <tr>
              <td className={td}>교사 계정</td>
              <td className={td}>이메일, 이름, 비밀번호(복원할 수 없게 변환하여 저장)</td>
              <td className={td}>운영자가 계정 생성</td>
            </tr>
          </tbody>
        </table>
        <p className="text-small">
          ※ 타자를 치는 동안의 키 입력 간격은 부정 이용 확인을 위해 그 판의 결과를 계산할 때만 사용하며 저장하지 않습니다. 주민등록번호 등
          고유식별정보와 민감정보는 처리하지 않습니다. 학생끼리는 닉네임만 보이고 실명은 교사 화면에서만 보입니다.
        </p>
      </Section>

      <Section id="child" title="3. 14세 미만 아동의 개인정보 처리">
        <p>
          서비스의 주 이용자는 중학교 1학년(만 14세 미만 포함) 학생입니다.{" "}
          {P.guardianConsent
            ? "서비스는 14세 미만 아동의 개인정보를 처리하기 위하여 법정대리인(보호자)의 동의를 받으며, 학교가 배부하는 가정통신문(동의서)으로 동의 여부를 확인합니다."
            : `서비스는 학교 교육과정 운영을 위한 업무로 개인정보를 처리하며(${P.legalBasis}), 처리 목적에 필요한 최소한의 정보만 처리합니다.`}{" "}
          학생이 이해하기 쉬운 &lsquo;학생용 개인정보 처리방침&rsquo;을 함께 제공합니다. 학생에게 맞춤형 광고를 제공하지 않으며 광고 목적의
          정보를 수집하지 않습니다.
        </p>
      </Section>

      <Section id="period" title="4. 개인정보의 처리 및 보유 기간">
        <ol className="list-decimal pl-6">
          <li>학생 계정과 학습 기록: 해당 학년도 종료(다음 해 2월 말) 후 {P.keepMonthsAfterYear}개월까지 보유한 뒤 파기합니다.</li>
          <li>로그인 실패 기록: 10분 동안 보유한 뒤 잠금 판단에 쓰이지 않으며, 로그인에 성공하거나 교사가 비밀번호를 초기화하면 즉시 삭제합니다.</li>
          <li>교사 계정: 담당 업무가 끝나 계정을 삭제할 때까지 보유합니다.</li>
          <li>다만 학생·보호자가 삭제를 요청하면 지체 없이 파기합니다.</li>
        </ol>
      </Section>

      <Section id="destroy" title="5. 개인정보의 파기 절차 및 방법">
        <p>
          보유 기간이 지나거나 처리 목적이 달성되는 등 개인정보가 불필요하게 되었을 때에는 개인정보 보호책임자의 승인을 받아 지체 없이
          파기합니다. 전자적 파일 형태의 개인정보는 데이터베이스에서 복원할 수 없는 방법으로 삭제하며, 종이로 출력한 명단 등은 분쇄하거나
          소각합니다. 다른 법령에 따라 보존해야 하는 개인정보는 없습니다.
        </p>
      </Section>

      <Section id="third" title="6. 개인정보의 제3자 제공">
        <p>서비스는 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다만 법률에 특별한 규정이 있는 경우에는 그에 따릅니다.</p>
      </Section>

      <Section id="consign" title="7. 개인정보 처리업무의 위탁">
        <p>서비스는 원활한 운영을 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
        <table className="w-full border-collapse text-small">
          <thead>
            <tr>
              <th className={th}>위탁받는 자(수탁자)</th>
              <th className={th}>위탁하는 업무</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={td}>Supabase, Inc.</td>
              <td className={td}>데이터베이스 보관, 로그인(인증), 친구 대결 실시간 통신</td>
            </tr>
            <tr>
              <td className={td}>Vercel Inc.</td>
              <td className={td}>웹 서비스 호스팅(서버 운영)</td>
            </tr>
          </tbody>
        </table>
        <p>위탁 시 위탁업무 수행목적 외 개인정보 처리 금지, 안전성 확보조치 등을 정한 수탁자의 약관·계약을 확인하고 있으며, 수탁자나 위탁업무가 바뀌면 이 처리방침으로 지체 없이 공개합니다.</p>
      </Section>

      <Section id="abroad" title="8. 개인정보의 국외 이전">
        <p>위 수탁자의 서버가 국외에 있어 다음과 같이 개인정보가 국외로 이전(처리위탁·보관)됩니다.</p>
        <table className="w-full border-collapse text-small">
          <thead>
            <tr>
              <th className={th}>이전받는 자(연락처)</th>
              <th className={th}>이전 국가</th>
              <th className={th}>항목</th>
              <th className={th}>시기·방법</th>
              <th className={th}>목적·보유기간</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={td}>Supabase, Inc. (privacy@supabase.io)</td>
              <td className={td}>{P.dbRegion}</td>
              <td className={td}>2.에 적힌 모든 항목</td>
              <td className={td}>서비스 이용 시 암호화 통신(TLS)으로 전송</td>
              <td className={td}>데이터 보관·인증 / 4.의 보유 기간까지</td>
            </tr>
            <tr>
              <td className={td}>Vercel Inc. (privacy@vercel.com)</td>
              <td className={td}>{P.hostRegion}</td>
              <td className={td}>서비스 이용 중 주고받는 정보</td>
              <td className={td}>서비스 이용 시 암호화 통신(TLS)으로 전송</td>
              <td className={td}>화면 제공·요청 처리 / 처리 후 저장하지 않음</td>
            </tr>
          </tbody>
        </table>
        <p>
          법적 근거: 「개인정보 보호법」 제28조의8제1항제3호(계약 이행을 위한 처리위탁·보관). 국외 이전을 원하지 않으면 교사에게 이용 중단과
          삭제를 요청할 수 있으며, 이 경우 서비스를 이용할 수 없습니다(수업은 다른 방법으로 참여할 수 있습니다).
        </p>
      </Section>

      <Section id="safety" title="9. 개인정보의 안전성 확보조치">
        <ol className="list-decimal pl-6">
          <li>관리적 조치: 개인정보 처리 담당자 최소화, 학생 정보는 담당 교사만 열람</li>
          <li>
            기술적 조치: 비밀번호의 일방향 변환 저장, 데이터베이스 접근 권한 통제(학생은 자기 기록과 자기 반 정보만 조회), 암호화 통신(HTTPS),
            로그인 반복 실패 시 잠금, 점수·코인 계산은 서버에서만 수행
          </li>
          <li>물리적 조치: 종이 명단(PIN 안내 등)은 사용 후 분쇄</li>
        </ol>
      </Section>

      <Section id="auto" title="10. 자동 수집 장치(쿠키)의 설치·운영 및 거부">
        <p>
          서비스는 로그인 상태를 유지하기 위해서만 쿠키를 사용합니다. 쿠키는 웹사이트가 브라우저에 보내는 작은 정보로, 이용자의 컴퓨터에
          저장됩니다. 광고나 행태정보 수집 목적의 쿠키는 사용하지 않으며, 제3자가 행태정보를 수집하도록 허용하지 않습니다.
        </p>
        <p>
          쿠키 저장을 거부하려면 크롬 오른쪽 위 &lsquo;⁝&rsquo; → 새 시크릿 창(Ctrl+Shift+N)을 이용하세요. 다만 쿠키를 거부하면 창을 닫을 때
          로그인이 풀립니다.
        </p>
      </Section>

      <Section id="decision" title="11. 자동화된 결정">
        <p>
          서비스는 성장 점수·단계(티어)·이상 기록 여부를 자동으로 계산합니다. 이상 기록으로 표시된 기록은 바로 반영하지 않고 교사가 직접
          확인한 뒤 결정하며, 성적 등 학생에게 중대한 영향을 주는 결정에 자동 계산 결과만으로 활용하지 않습니다. 계산 방법은 서비스 안의
          &lsquo;도움말&rsquo;에서 확인할 수 있고, 설명이나 다시 검토를 원하면 아래 담당자에게 요청할 수 있습니다.
        </p>
      </Section>

      <Section id="rights" title="12. 정보주체와 법정대리인의 권리·의무 및 행사방법">
        <ol className="list-decimal pl-6">
          <li>학생은 언제든지 자기 개인정보의 열람·정정·삭제·처리정지를 요구할 수 있습니다.</li>
          <li>14세 미만 학생의 권리는 법정대리인(보호자)이 행사할 수 있으며, 14세 이상 학생은 본인이나 보호자를 통해 행사할 수 있습니다.</li>
          <li>
            요구 방법: 담당 교사에게 말하거나, 아래 연락처로 서면·전화·이메일로 요구할 수 있습니다. 내 기록은 로그인 후 홈 화면에서 언제든지
            볼 수 있습니다. 서비스는 요구를 받은 날부터 10일 이내에 처리 결과를 알려 드립니다.
          </li>
          <li>대리인이 요구하는 경우 「개인정보 처리 방법에 관한 고시」 별지 제11호 서식의 위임장을 제출해야 합니다.</li>
          <li>다른 사람의 그림 비밀번호를 알아내거나 대신 로그인해서는 안 됩니다.</li>
        </ol>
      </Section>

      <Section id="officer" title="13. 개인정보 보호책임자">
        <p>서비스는 개인정보 처리에 관한 업무를 총괄하고 불만 처리와 피해 구제를 위하여 다음과 같이 개인정보 보호책임자와 담당자를 두고 있습니다.</p>
        <ul className="list-disc pl-6">
          <li>
            개인정보 보호책임자: {P.officer.name} ({P.officer.title}) · {P.officer.phone}
            {P.officer.email && ` · ${P.officer.email}`}
          </li>
          <li>
            개인정보 담당·고충 처리: {P.manager.name} ({P.manager.dept}) · {P.manager.phone} · {P.manager.email}
          </li>
        </ul>
      </Section>

      <Section id="remedy" title="14. 권익침해 구제방법">
        <ol className="list-decimal pl-6">
          <li>개인정보 분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
          <li>개인정보침해 신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
          <li>경찰청: (국번없이) 182 (ecrm.police.go.kr)</li>
        </ol>
      </Section>

      <Section id="change" title="15. 개인정보 처리방침의 변경">
        <p>이 개인정보 처리방침은 {P.effectiveDate}부터 적용됩니다. 처리방침이 바뀌면 바뀌기 전과 후를 비교해 서비스 안에서 알려 드립니다.</p>
        {P.history.length > 0 && (
          <ul className="list-disc pl-6">
            {P.history.map((h) => (
              <li key={h.from}>
                <a href={h.url} className="underline">
                  {h.from} ~ {h.to} 적용
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/** 학생용 (작성지침 부록2: 아동을 위한 개인정보 처리방침 — 쉬운 말, 질문 형식) */
function KidPolicy() {
  const qa: [string, React.ReactNode][] = [
    ["개인정보가 뭐예요?", "나를 알아볼 수 있는 정보예요. 이름, 학번(몇 학년 몇 반 몇 번인지), 닉네임 같은 거예요."],
    [
      "어떤 정보를 모으나요?",
      "이름, 학번, 내가 정한 닉네임과 그림 비밀번호, 그리고 타자 연습 기록(몇 타 쳤는지, 얼마나 정확했는지, 자주 틀린 키)이에요. 주민등록번호나 전화번호는 모으지 않아요.",
    ],
    ["내 정보는 무엇에 쓰여요?", "타자 연습을 하고, 내가 얼마나 성장했는지 보여 주고, 선생님이 수업에서 도와주는 데만 써요."],
    ["친구들이 내 이름을 볼 수 있나요?", "아니요! 친구들에게는 닉네임만 보여요. 진짜 이름은 선생님만 볼 수 있어요."],
    [
      "그림 비밀번호는 안전한가요?",
      "그림 비밀번호는 아무도 알아볼 수 없는 긴 암호로 바꿔서 저장해요. 선생님도 내 그림 비밀번호를 볼 수 없어요. 친구에게 알려 주지 마세요!",
    ],
    ["내 정보를 다른 회사에 주나요?", "주지 않아요. 다만 정보를 안전하게 보관해 주는 회사(Supabase, Vercel)에 보관을 맡기고 있어요. 이 회사들의 컴퓨터는 외국에 있어요."],
    ["언제까지 보관하고, 언제 지우나요?", `이번 학년도가 끝나고 ${P.keepMonthsAfterYear}개월 뒤에 지워요. 내가 지워 달라고 하면 바로 지워요.`],
    ["광고가 나오나요?", "아니요. 광고도 없고, 광고를 위해 내 정보를 모으지도 않아요."],
    ["내 정보를 보거나 고치고 싶으면요?", "로그인하면 홈 화면에서 내 기록을 볼 수 있어요. 고치거나 지우고 싶으면 선생님께 말하면 돼요. 보호자께서 대신 요청하실 수도 있어요."],
    [
      "문제가 생기면 어디에 물어봐요?",
      <>
        먼저 정보 선생님께 말해 주세요 ({P.manager.phone}). 그래도 해결이 안 되면 개인정보침해 신고센터(국번없이 118)에서 도움을 받을 수 있어요.
      </>,
    ],
  ];
  return (
    <div className="flex flex-col gap-3 font-pixel text-body leading-7 text-navy-900">
      <p>
        {P.service}에서 여러분의 개인정보를 어떻게 다루는지 쉽게 정리했어요. 더 자세한 내용은 &lsquo;전체 처리방침&rsquo; 탭에 있어요.
      </p>
      {qa.map(([q, a]) => (
        <div key={q} className="border-3 border-navy-900 bg-paper px-4 py-3">
          <p className="font-bold">Q. {q}</p>
          <p className="mt-1">{a}</p>
        </div>
      ))}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <DesktopBackground quiet>
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <RetroWindow title="개인정보 처리방침.txt">
          <h1 className="mb-1 font-title text-title text-navy-900">
            {P.operator} {P.service} 개인정보 처리방침
          </h1>
          <p className="mb-4 text-small text-text-muted">시행일 {P.effectiveDate}</p>
          <PrivacyTabs kid={<KidPolicy />} full={<FullPolicy />} />
          <p className="mt-6 text-center">
            <Link href="/login" className="underline underline-offset-4">
              로그인 화면으로
            </Link>
          </p>
        </RetroWindow>
      </main>
    </DesktopBackground>
  );
}
