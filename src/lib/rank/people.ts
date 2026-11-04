import "server-only";

// 랭킹에 나오는 사람들: 이 사람과 같은 학년 학생 (선생님 테스트 계정 빼고). 닉네임과 반만 써요.
// 선생님은 학년이 없어서 1학년으로 봐요 (교사는 매년 1학년 담당)

import { isTestNumber } from "@/lib/auth/testAccount";
import { ensureSchoolYear, loadEnrollment } from "@/lib/auth/viewer";
import { classesOf } from "@/lib/battle/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type RankPerson = { nickname: string; classNo: number };
/** 랭킹 한 줄 (닉네임만) */
export type RankEntry = { nickname: string; classNo: number; value: string; me: boolean; detail?: string };

export async function gradePeople(userId: string): Promise<Map<string, RankPerson>> {
  const people = new Map<string, RankPerson>();
  const enrollment = await loadEnrollment(userId);
  const schoolYearId = enrollment?.schoolYearId ?? (await ensureSchoolYear()).schoolYearId;
  const classes = await classesOf(schoolYearId, enrollment?.grade ?? 1);
  if (!classes.length) return people;
  const { data } = await createAdminClient()
    .from("enrollments")
    .select("student_id, class_id, number, profiles!inner(nickname, role)")
    .in(
      "class_id",
      classes.map((c) => c.id),
    );
  type Enr = { student_id: string; class_id: string; number: number; profiles: { nickname: string | null; role: string } };
  for (const e of (data ?? []) as unknown as Enr[]) {
    if (e.profiles.role !== "student" || isTestNumber(e.number)) continue;
    people.set(e.student_id, { nickname: e.profiles.nickname ?? "친구", classNo: classes.find((c) => c.id === e.class_id)?.class_no ?? 0 });
  }
  return people;
}

/** 행이 많을 수 있어서 1000개씩 나눠 읽어요 */
export async function allRows<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await read(page * 1000, page * 1000 + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
