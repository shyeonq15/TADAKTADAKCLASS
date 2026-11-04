import "server-only";

// 영단어 연구소 (서버 전용): 틀린 단어장, 묶음 통과, 이번 주 단어 보상

import { VOCAB, VOCAB_CLEAR } from "@/config/vocab";
import { dayKeyKST } from "@/lib/practice/day";
import { addCoins } from "@/lib/practice/server";
import { weekOf } from "@/lib/season";
import { createAdminClient } from "@/lib/supabase/admin";
import { findWord, getPart, partLabel, weekPart } from "./words";

export type NotebookItem = { en: string; ko: string; misses: number; streak: number };
export type Notebook = { ready: boolean; items: NotebookItem[] };
export type VocabWeek = {
  week: number;
  part: number;
  label: string;
  start: string;
  end: string;
  rain: boolean;
  blank: boolean;
  listen: boolean;
  claimed: boolean;
  coins: number;
};
export type VocabAnswer = { en: string; ok: boolean };
export type VocabClearKind = "blank" | "listen";

type MistakeRow = { word: string; misses: number; streak: number };

export async function loadNotebook(userId: string): Promise<Notebook> {
  const { data, error } = await createAdminClient()
    .from("vocab_mistakes")
    .select("word, misses, streak")
    .eq("student_id", userId)
    .order("updated_at", { ascending: false })
    .limit(500);
  // 표가 아직 없으면 (SQL 실행 전) 빈 단어장
  if (error) return { ready: false, items: [] };
  const items = ((data ?? []) as MistakeRow[]).flatMap((r) => {
    const w = findWord(r.word);
    return w ? [{ en: w.en, ko: w.ko, misses: r.misses, streak: r.streak }] : [];
  });
  return { ready: true, items };
}

/**
 * 답 기록: 틀리면 단어장에 넣고(틀린 횟수 +1, 연속 맞힘 0),
 * 단어장에 있는 단어를 맞히면 연속 맞힘 +1 → 정해진 만큼 맞히면 단어장에서 빼요
 */
export async function recordAnswers(userId: string, answers: readonly VocabAnswer[]) {
  // 같은 판에서 같은 단어는 처음 답만 (다시 나온 단어를 맞혀서 바로 빠지지 않게)
  const first = new Map<string, boolean>();
  for (const a of answers.slice(0, 300)) {
    if (typeof a?.en === "string" && findWord(a.en) && !first.has(a.en)) first.set(a.en, !!a.ok);
  }
  if (!first.size) return;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vocab_mistakes")
    .select("word, misses, streak")
    .eq("student_id", userId)
    .in("word", [...first.keys()]);
  if (error) return;
  const have = new Map(((data ?? []) as MistakeRow[]).map((r) => [r.word, r]));
  const now = new Date().toISOString();
  const upserts: { student_id: string; word: string; misses: number; streak: number; updated_at: string }[] = [];
  const removes: string[] = [];
  for (const [en, ok] of first) {
    const row = have.get(en);
    if (!ok) upserts.push({ student_id: userId, word: en, misses: (row?.misses ?? 0) + 1, streak: 0, updated_at: now });
    else if (row) {
      if (row.streak + 1 >= VOCAB.review.rightToRemove) removes.push(en);
      else upserts.push({ student_id: userId, word: en, misses: row.misses, streak: row.streak + 1, updated_at: now });
    }
  }
  if (upserts.length) await admin.from("vocab_mistakes").upsert(upserts);
  if (removes.length) await admin.from("vocab_mistakes").delete().eq("student_id", userId).in("word", removes);
}

/** 빈칸 채우기·듣고 쓰기 묶음 하나를 끝까지 했을 때. 처음 끝낼 때만 코인 */
export async function clearPart(userId: string, kind: VocabClearKind, part: number): Promise<{ first: boolean; coins: number } | { error: string }> {
  if (!(kind in VOCAB_CLEAR) || kind === ("week" as string)) return { error: "없는 활동이에요." };
  const p = getPart(part);
  if (!p) return { error: "없는 단어 묶음이에요." };
  const ins = await createAdminClient().from("level_clears").insert({ student_id: userId, track: VOCAB_CLEAR[kind], level: part });
  const first = !ins.error;
  if (first) await addCoins(userId, VOCAB.clearCoins, `영단어 ${kind === "blank" ? "빈칸 채우기" : "듣고 쓰기"} ${partLabel(p)}`);
  return { first, coins: first ? VOCAB.clearCoins : 0 };
}

/** 이번 주 단어: 이번 주 묶음으로 뜻 비 한 판 + 빈칸 채우기 + 듣고 쓰기를 하면 보상 */
export async function loadVocabWeek(userId: string): Promise<VocabWeek> {
  const range = weekOf(dayKeyKST());
  const { week, part } = weekPart(range.start);
  const since = new Date(`${range.start}T00:00:00+09:00`).toISOString();
  const admin = createAdminClient();
  const [games, clears] = await Promise.all([
    admin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("kind", "game")
      .eq("mode", "vocab")
      .eq("suspicious", false)
      .gte("created_at", since),
    admin.from("level_clears").select("track, level").eq("student_id", userId).in("track", Object.values(VOCAB_CLEAR)),
  ]);
  const has = (track: string, level: number) => (clears.data ?? []).some((c) => c.track === track && c.level === level);
  return {
    week,
    part,
    label: partLabel(getPart(part)!),
    start: range.start,
    end: range.end,
    rain: (games.count ?? 0) > 0,
    blank: has(VOCAB_CLEAR.blank, part),
    listen: has(VOCAB_CLEAR.listen, part),
    claimed: has(VOCAB_CLEAR.week, week),
    coins: VOCAB.week.coins,
  };
}

export async function claimVocabWeek(userId: string): Promise<{ coins: number } | { error: string }> {
  const w = await loadVocabWeek(userId);
  if (w.claimed) return { error: "이번 주 보상은 이미 받았어요." };
  if (!(w.rain && w.blank && w.listen)) return { error: "세 가지를 모두 해야 받을 수 있어요." };
  const ins = await createAdminClient().from("level_clears").insert({ student_id: userId, track: VOCAB_CLEAR.week, level: w.week });
  if (ins.error) return { error: "이번 주 보상은 이미 받았어요." };
  await addCoins(userId, w.coins, `이번 주 영단어 (${w.label})`);
  return { coins: w.coins };
}
