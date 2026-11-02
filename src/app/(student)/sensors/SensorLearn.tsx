"use client";

import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";

// 센서·액추에이터 분류 전에 읽는 "알아보기": 입력·처리·출력, 아날로그와 디지털

/** 아날로그(부드러운 곡선)와 디지털(0·1 계단) 그림 */
function Signals() {
  const analog = Array.from({ length: 61 }, (_, i) => {
    const x = (i / 60) * 200;
    const y = 40 - Math.sin((i / 60) * Math.PI * 2) * 28;
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const digital = "M0,68 L40,68 L40,12 L90,12 L90,68 L120,68 L120,12 L170,12 L170,68 L200,68";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <figure className="flex flex-col items-center gap-1">
        <svg viewBox="0 0 200 80" className="w-full max-w-60 border-2 border-navy-900 bg-paper" aria-hidden>
          <path d={analog} fill="none" stroke="#3b6fe0" strokeWidth={3} />
        </svg>
        <figcaption className="font-pixel text-small">아날로그: 값이 끊김 없이 부드럽게 변해요</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-1">
        <svg viewBox="0 0 200 80" className="w-full max-w-60 border-2 border-navy-900 bg-paper" aria-hidden>
          <path d={digital} fill="none" stroke="#ff3b6b" strokeWidth={3} />
          <text x={4} y={10} fontSize={9} fill="#22243a">1</text>
          <text x={4} y={78} fontSize={9} fill="#22243a">0</text>
        </svg>
        <figcaption className="font-pixel text-small">디지털: 0과 1 두 가지로 딱딱 끊어져요</figcaption>
      </figure>
    </div>
  );
}

export function SensorLearn({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 font-pixel text-body text-navy-900">
      <RetroWindow title="① 입력 → 처리 → 출력">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <span className="border-3 border-navy-900 bg-sky-200 px-3 py-2">
              <strong>입력</strong>
              <br />
              <span className="text-small">센서</span>
            </span>
            <span aria-hidden>→</span>
            <span className="border-3 border-navy-900 bg-yellow-400 px-3 py-2">
              <strong>처리</strong>
              <br />
              <span className="text-small">컴퓨터 (아두이노·마이크로비트)</span>
            </span>
            <span aria-hidden>→</span>
            <span className="border-3 border-navy-900 bg-pink-400 px-3 py-2">
              <strong>출력</strong>
              <br />
              <span className="text-small">액추에이터</span>
            </span>
          </div>
          <ul className="list-disc pl-5">
            <li>
              <strong>입력 = 센서</strong>: 바깥 세상의 정보(빛, 온도, 소리, 누름, 움직임)를 <em>받아서</em> 컴퓨터 안으로 보내요. 사람의 눈·귀·피부 같은 역할이에요.
            </li>
            <li>
              <strong>처리 = 컴퓨터</strong>: 들어온 값을 보고 &ldquo;어두우면 불을 켜자&rdquo;처럼 프로그램대로 판단해요.
            </li>
            <li>
              <strong>출력 = 액추에이터</strong>: 컴퓨터의 명령을 받아 빛·소리·움직임으로 <em>내보내요</em>. 사람의 손·발·입 같은 역할이에요. (LED, 부저, 모터 …)
            </li>
          </ul>
          <p className="border-l-4 border-navy-900 bg-paper px-3 py-2">
            💡 예: <strong>조도 센서</strong>가 어두워진 걸 알아채면(입력) → 마이크로비트가 &ldquo;어둡다!&rdquo;고 판단해서(처리) → <strong>LED</strong>를
            켜요(출력). 가로등이 이렇게 동작해요.
          </p>
          <p className="text-small">
            헷갈리면 이렇게 물어봐요: &ldquo;이 부품은 <strong>무엇을 알아내나요?</strong>&rdquo; → 입력 / &ldquo;이 부품은 <strong>무엇을 하나요?</strong>&rdquo; → 출력
          </p>
        </div>
      </RetroWindow>

      <RetroWindow title="② 아날로그와 디지털">
        <div className="flex flex-col gap-3">
          <Signals />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border-3 border-navy-900 bg-paper px-3 py-2">
              <p className="font-bold text-sky-500">아날로그 = 여러 단계의 값</p>
              <ul className="list-disc pl-5 text-small">
                <li>밝기, 온도, 소리 크기처럼 조금씩 연속적으로 변하는 값이에요.</li>
                <li>
                  아두이노는 아날로그 입력을 <strong>0 ~ 1023</strong>(마이크로비트도 0~1023) 사이 숫자로 읽어요. 아주 어두우면 50, 밝으면 900처럼요.
                </li>
                <li>
                  아날로그 출력은 세기를 <strong>0 ~ 255</strong>처럼 여러 단계로 정해요. LED를 은은하게~밝게, 모터를 천천히~빠르게.
                </li>
                <li>예: 볼륨 다이얼, 온도계 눈금, 자동차 가속 페달</li>
              </ul>
            </div>
            <div className="border-3 border-navy-900 bg-paper px-3 py-2">
              <p className="font-bold text-red-500">디지털 = 0 또는 1, 두 가지</p>
              <ul className="list-disc pl-5 text-small">
                <li>켜짐/꺼짐, 눌림/안 눌림, 있음/없음처럼 딱 두 상태만 있어요.</li>
                <li>
                  디지털 입력은 <strong>0(LOW)</strong> 또는 <strong>1(HIGH)</strong>로 읽어요. 버튼을 누르면 1, 떼면 0.
                </li>
                <li>
                  디지털 출력은 <strong>켜기(1)</strong> 또는 <strong>끄기(0)</strong>만 해요. LED를 켜거나 끄기만, 중간 밝기는 없어요.
                </li>
                <li>예: 전등 스위치, 초인종 버튼, 문 열림 감지</li>
              </ul>
            </div>
          </div>
          <p className="border-l-4 border-navy-900 bg-paper px-3 py-2">
            💡 같은 LED도 <strong>켜기/끄기만</strong> 하면 디지털 출력, <strong>밝기를 여러 단계로 조절</strong>하면 아날로그 출력이에요. 부품 이름보다{" "}
            <strong>&ldquo;값이 두 가지인가, 여러 단계인가&rdquo;</strong>를 보세요!
          </p>
          <p className="text-small text-text-muted">
            ※ 사실 아두이노의 아날로그 출력은 켜고 끄기를 아주 빠르게 반복해서(PWM) 중간 세기처럼 보이게 만들어요. 우리 수업에서는 &ldquo;여러 단계로 조절하면
            아날로그 출력&rdquo;으로 생각해요.
          </p>
        </div>
      </RetroWindow>

      <RetroWindow title="③ 정리 표">
        <table className="w-full border-collapse text-center text-small">
          <thead>
            <tr>
              <th className="border-2 border-navy-900 bg-win-gray p-1" />
              <th className="border-2 border-navy-900 bg-win-gray p-1">아날로그 (여러 값)</th>
              <th className="border-2 border-navy-900 bg-win-gray p-1">디지털 (0 / 1)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="border-2 border-navy-900 bg-sky-200 p-1">입력 (센서)</th>
              <td className="border-2 border-navy-900 bg-paper p-1">조도·온도·소리 크기 센서, 가변 저항</td>
              <td className="border-2 border-navy-900 bg-paper p-1">버튼, 터치 스위치, 인체 감지 센서</td>
            </tr>
            <tr>
              <th className="border-2 border-navy-900 bg-pink-400 p-1">출력 (액추에이터)</th>
              <td className="border-2 border-navy-900 bg-paper p-1">LED 밝기 조절, 서보 모터 각도, 모터 속도</td>
              <td className="border-2 border-navy-900 bg-paper p-1">LED 켜기/끄기, 릴레이, 능동 부저</td>
            </tr>
          </tbody>
        </table>
      </RetroWindow>

      <div className="flex justify-center">
        <PixelButton variant="success" autoFocus onClick={onStart}>
          ▶ 분류 문제 풀기 (Enter)
        </PixelButton>
      </div>
    </div>
  );
}
