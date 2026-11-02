"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PROFILE, TRACK_LABELS, TRACKS } from "@/config/game";
import { BADGES, SEASON_FINISH_DAYS } from "@/config/badges";
import { renameNickname, updateBio } from "@/app/(student)/actions";
import { Minimi } from "@/components/pixel/Minimi";
import { DialogBox } from "@/components/ui/DialogBox";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { StatCard } from "@/components/ui/StatCard";
import { TierBadge } from "@/components/ui/TierBadge";
import { safeCall } from "@/lib/practice/call";
import { STAGE_COUNT, stageName } from "@/lib/practice/stages";
import { useSetPracticeData } from "@/lib/practice/store";
import type { ProfileData } from "@/lib/profile/server";

type Mate = { id: string; nickname: string; me: boolean };

/** 싸이월드 미니홈피 느낌의 프로필: 왼쪽 미니미·소개, 오른쪽 티어·기록 */
export function ProfileView({ p, mates }: { p: ProfileData; mates: Mate[] }) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-4">
        <RetroWindow title={p.mine ? "내 미니홈피" : `${p.nickname}의 미니홈피`}>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="win-bevel-pressed flex w-full justify-center bg-sky-100 py-4">
              <Minimi look={p.look} scale={6} label={`${p.nickname}의 미니미`} />
            </div>
            <p className="font-title text-title text-navy-900">{p.nickname}</p>
            <div className="flex flex-wrap justify-center gap-1">
              <TierBadge tier={p.mainTier} />
              {p.codeMaster && <TierBadge tier={p.tiers.code} codeMaster />}
            </div>
            <p className="font-pixel text-small text-text-muted">{p.classLabel}</p>
          </div>
          <Bio p={p} />
        </RetroWindow>

        {p.equipped.length > 0 && (
          <RetroWindow title="착용 중">
            <ul className="font-pixel text-small">
              {p.equipped.map((e) => (
                <li key={e.slot} className="flex justify-between border-b border-win-shadow py-1">
                  <span className="text-text-muted">{e.slot}</span>
                  <span>{e.name}</span>
                </li>
              ))}
            </ul>
            {p.mine && (
              <PixelLink href="/shop" size="sm" variant="ghost" className="mt-2">
                상점에서 꾸미기
              </PixelLink>
            )}
          </RetroWindow>
        )}

        {mates.length > 0 && (
          <RetroWindow title="우리 반 친구들">
            <ul className="flex flex-wrap gap-1 font-pixel text-small">
              {mates.map((m) => (
                <li key={m.id}>
                  <Link
                    href={m.me ? "/profile" : `/profile/${m.id}`}
                    className={`inline-block border-2 border-navy-900 px-2 py-0.5 ${m.id === p.id ? "bg-lime-400 font-bold" : "bg-paper hover:bg-sky-100"}`}
                  >
                    {m.nickname}
                  </Link>
                </li>
              ))}
            </ul>
          </RetroWindow>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <RetroWindow title="트랙 티어">
          <table className="w-full font-pixel text-body">
            <thead>
              <tr className="border-b-2 border-navy-900 text-left text-small text-text-muted">
                <th className="py-1">트랙</th>
                <th className="py-1">티어</th>
                <th className="py-1">지금 단계</th>
                {p.private && <th className="py-1 text-right">내 최고 타수</th>}
              </tr>
            </thead>
            <tbody>
              {TRACKS.map((t) => {
                const best = p.private?.bestCpm[t];
                return (
                  <tr key={t} className="border-b border-win-shadow">
                    <td className="py-1.5 font-bold">{TRACK_LABELS[t]}</td>
                    <td className="py-1.5">
                      <TierBadge tier={p.tiers[t]} />
                    </td>
                    <td className="py-1.5">{p.stages[t] >= STAGE_COUNT ? "레전드 5단계 (마지막)" : stageName(p.stages[t])}</td>
                    {p.private && (
                      <td className="py-1.5 text-right">{best ? `${best.cpm}타 · ${best.accuracy}%` : <span className="text-text-muted">-</span>}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {p.private && <p className="mt-2 font-pixel text-small text-text-muted">최고 타수는 나만 볼 수 있어요. 친구에게는 티어만 보여요.</p>}
        </RetroWindow>

        <RetroWindow title="기록">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <div className="win-bevel-pressed flex-1 bg-paper px-4 py-2">
              <p className="font-pixel text-small text-text-muted">보스 티어</p>
              <div className="py-1">
                {p.bossTier ? <TierBadge tier={p.bossTier} /> : <span className="font-pixel text-body text-text-muted">아직 없어요</span>}
              </div>
              <p className="font-pixel text-small">{p.bossDefeated}마리 격파</p>
            </div>
            <StatCard label="단어 비 최고 점수" value={p.gameBest.rain} unit="점" />
            <StatCard label="토끼 달리기 최고 점수" value={p.gameBest.runner} unit="점" />
            <StatCard label="파이썬 첫걸음" value={`${p.lessonsDone}/${p.lessonCount}`} unit="강" />
            <StatCard label="연속 연습" value={p.streak} unit="일" />
            <StatCard label="오늘의 미션" value={p.missionToday ? "완료!" : "아직"} />
            {p.private && <StatCard label="보유 코인" value={p.private.coins} unit="코인" />}
          </div>
        </RetroWindow>

        <RetroWindow title={`칭호 모음 (${p.badges.length} / ${BADGES.length})`}>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {BADGES.map((b) => {
              const got = p.badges.includes(b.id);
              return (
                <li
                  key={b.id}
                  title={b.how}
                  className={`flex items-center gap-2 border-2 border-navy-900 px-2 py-1.5 font-pixel text-small ${
                    got ? "bg-yellow-400 text-navy-900 shadow-pixel-sm" : "bg-win-gray text-text-muted"
                  }`}
                >
                  <span className={`text-heading leading-none ${got ? "" : "opacity-30 grayscale"}`}>{got ? b.icon : "🔒"}</span>
                  <span className="min-w-0">
                    <strong className="block truncate">{b.name}</strong>
                    {!got && <span className="block truncate">{b.how}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 font-pixel text-small text-text-muted">
            칭호는 등수가 아니라 &ldquo;해냈다!&rdquo;를 모아요. 가장 길게 이어서 연습한 날: {p.maxStreak}일
          </p>
        </RetroWindow>

        {p.seasons.length > 0 && (
          <RetroWindow title="시즌 기록">
            <ul className="flex flex-col font-pixel text-body text-navy-900">
              {p.seasons.map((s) => (
                <li key={s.n} className="flex flex-wrap items-center gap-2 border-b border-win-shadow py-1.5">
                  <strong className="w-16 shrink-0">시즌 {s.n}</strong>
                  <span className="text-small text-text-muted">
                    {s.start.slice(5)} ~ {s.end.slice(5)}
                  </span>
                  <span className="text-small">연습한 날 {s.days}일</span>
                  {s.finished && <span className="border-2 border-navy-900 bg-lime-400 px-2 text-small">🏁 완주</span>}
                  {s.classKing && <span className="border-2 border-navy-900 bg-yellow-400 px-2 text-small">🌳 우리 반 성장왕</span>}
                  {s.current && <span className="ml-auto text-small text-text-muted">진행 중</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 font-pixel text-small text-text-muted">
              시즌은 2주예요. {SEASON_FINISH_DAYS}일 이상 연습하면 완주! 시즌이 끝나면 우리 반에서 성장 점수가 가장 높은 친구가 성장왕이 돼요.
            </p>
          </RetroWindow>
        )}

        {p.mine && p.private && <NicknameChange p={p} />}

        {p.oldNicknames.length > 0 && (
          <RetroWindow title="예전 닉네임">
            <ul className="flex flex-wrap gap-2 font-pixel text-small">
              {p.oldNicknames.map((n, i) => (
                <li key={i} className="border-2 border-navy-900 bg-paper px-2 py-0.5">
                  {n.nickname} <span className="text-text-muted">~{new Date(n.at).toLocaleDateString("ko-KR")}</span>
                </li>
              ))}
            </ul>
          </RetroWindow>
        )}
      </div>
    </div>
  );
}

/** 한 줄 자기소개 (내 프로필이면 고칠 수 있어요) */
function Bio({ p }: { p: ProfileData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(p.bio);
  const [msg, setMsg] = useState("");

  if (!p.mine || !editing) {
    return (
      <div className="mt-3 border-t-2 border-dashed border-sky-300 pt-2">
        <p className="min-h-6 whitespace-pre-wrap break-words font-pixel text-body text-navy-900">
          {p.bio || <span className="text-text-muted">{p.mine ? "자기소개를 써 보세요!" : "아직 자기소개가 없어요."}</span>}
        </p>
        {p.mine && (
          <PixelButton size="sm" variant="ghost" className="mt-2" onClick={() => setEditing(true)} disabled={!p.private?.ready}>
            ✎ 자기소개 고치기
          </PixelButton>
        )}
        {msg && <p className="mt-1 font-pixel text-small text-lime-800">{msg}</p>}
      </div>
    );
  }

  const save = async () => {
    const res = await safeCall(() => updateBio(text));
    if ("error" in res) return setMsg(res.error);
    setEditing(false);
    setMsg("자기소개를 저장했다!");
    router.refresh();
  };

  return (
    <div className="mt-3 flex flex-col gap-2 border-t-2 border-dashed border-sky-300 pt-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={PROFILE.bioMax}
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="예: 코드 레전드가 목표! 🐰"
        className="win-bevel-pressed h-10 w-full bg-paper px-2 font-pixel text-body outline-none"
      />
      <div className="flex items-center gap-2">
        <span className="font-pixel text-small text-text-muted">
          {text.length}/{PROFILE.bioMax}
        </span>
        <PixelButton size="sm" variant="success" className="ml-auto" onClick={save}>
          저장
        </PixelButton>
        <PixelButton size="sm" variant="ghost" onClick={() => setEditing(false)}>
          취소
        </PixelButton>
      </div>
      {msg && <p className="font-pixel text-small text-red-500">{msg}</p>}
    </div>
  );
}

/** 닉네임 변경권: 처음 한 번 무료, 그다음부터 코인 */
function NicknameChange({ p }: { p: ProfileData }) {
  const router = useRouter();
  const setData = useSetPracticeData();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const price = p.private!.nicknamePrice;

  const change = async () => {
    if (busy) return;
    setBusy(true);
    const res = await safeCall(() => renameNickname(name));
    setBusy(false);
    if ("error" in res) return setMsg(res.error);
    setData(res.data);
    setName("");
    setMsg(res.cost > 0 ? `닉네임을 바꿨다! 코인 ${res.cost}개를 썼다.` : "닉네임을 바꿨다! (첫 변경은 무료)");
    router.refresh();
  };

  return (
    <RetroWindow title="닉네임 변경권">
      <p className="mb-2 font-pixel text-small text-navy-900">
        {price === 0 ? "처음 한 번은 무료예요!" : `닉네임 변경권은 ${price}코인이에요.`} 예전 닉네임은 프로필에 남아서 친구들도 볼 수 있어요.
      </p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={12}
          placeholder="새 닉네임 (2~12글자)"
          className="win-bevel-pressed h-10 min-w-0 flex-1 bg-paper px-2 font-pixel text-body outline-none"
        />
        <PixelButton variant="reward" disabled={busy || name.trim().length < 2 || !p.private!.ready} onClick={change}>
          {price === 0 ? "무료로 바꾸기" : `${price}코인으로 바꾸기`}
        </PixelButton>
      </div>
      {!p.private!.ready && <p className="mt-2 font-pixel text-small text-text-muted">닉네임 변경권을 준비 중이에요. 선생님께 알려 주세요!</p>}
      {msg && (
        <div className="mt-2">
          <DialogBox key={msg} text={msg} />
        </div>
      )}
    </RetroWindow>
  );
}
