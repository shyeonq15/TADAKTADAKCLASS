"use client";

import { useEffect, useRef } from "react";
import { GROWTH, type BattleEvent } from "@/config/game";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const mdw = (day: string) => {
  const [, m, d] = day.split("-").map(Number);
  return `${m}월 ${d}일(${WEEKDAY[new Date(`${day}T00:00:00Z`).getUTCDay()]})`;
};

const seenKey = (id: string) => `tadak-event-seen:${id}`;

/** 특별 반 대결 공지: 이 기기에서 처음 홈에 들어오면 한 번 떠요 (닫으면 다시 안 떠요) */
export function EventNotice({ event }: { event: BattleEvent }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(seenKey(event.id)) === "1";
    } catch {}
    if (!seen) ref.current?.showModal();
  }, [event.id]);

  const close = () => {
    try {
      localStorage.setItem(seenKey(event.id), "1");
    } catch {}
    ref.current?.close();
  };

  return (
    <dialog
      ref={ref}
      onCancel={close}
      className="m-auto w-[min(600px,92vw)] bg-transparent p-0 backdrop:bg-navy-900/50"
    >
      <RetroWindow title="📢 반대결_이벤트.txt" onClose={close}>
        <div className="flex max-h-[75vh] flex-col gap-3 overflow-y-auto font-pixel text-body leading-7 text-navy-900">
          <p className="title-lime text-center text-title">🍦 {event.title} 🍦</p>
          <p className="border-3 border-pink-400 bg-cream px-3 py-2 text-center font-bold">
            {mdw(event.start)} ~ {mdw(event.end)}
            <br />
            마지막 날 <strong>1위 반</strong> 모두에게 <strong>{event.prize}</strong>를 선물해요!
          </p>
          <ul className="list-disc pl-5">
            <li>이 기간에는 반 점수가 리셋되지 않고 끝까지 쌓여요.</li>
            <li>반 점수 = 우리 반 성장 점수 합 ÷ 반 인원. 빠른 친구 한 명보다 <strong>모두가 매일</strong> 하는 반이 이겨요!</li>
            <li>
              이제 하루에 성장 점수를 <strong>{GROWTH.dailyCap}점</strong>까지 모을 수 있어요.
            </li>
          </ul>
          <div className="win-bevel-pressed bg-paper px-3 py-2 text-small">
            <p className="mb-1 font-bold">성장 점수 모으는 법</p>
            <ul className="list-disc pl-5">
              <li>오늘의 미션 끝내기 +{GROWTH.participation.points}</li>
              <li>
                교과 탐험 지문·영단어·퀴즈·이진수·픽셀 아트 하나 끝낼 때마다 +{GROWTH.activity.pointsPerActivity} (최대{" "}
                {GROWTH.activity.max})
              </li>
              <li>
                연습·게임·대결 한 판 끝까지 칠 때마다 +{GROWTH.effort.pointsPerRound} (최대 {GROWTH.effort.max})
              </li>
              <li>내 기록보다 빨라지면 최대 +{GROWTH.speed.max}, 더 정확해지면 최대 +{GROWTH.accuracy.max}</li>
              <li>
                매일 연속으로 오면 최대 +{GROWTH.streak.max}, 새 단계 처음 통과 +{GROWTH.levelFirstClear.points}
              </li>
            </ul>
          </div>
          <div className="flex justify-center">
            <PixelButton variant="success" onClick={close} autoFocus>
              좋아, 우리 반 화이팅!
            </PixelButton>
          </div>
        </div>
      </RetroWindow>
    </dialog>
  );
}
