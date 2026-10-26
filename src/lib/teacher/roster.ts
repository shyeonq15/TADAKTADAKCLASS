import "server-only";

// 반 옮기기 · 진급 (PRD T1: 새 반으로 옮겨도 기록은 학생에게 그대로). 교사 확인은 부르는 쪽(actions)에서 해요.
//  · 기록(연습·코인·티어·미니미)은 모두 학생 계정에 붙어 있어서, 반 배정(enrollments)만 바꾸면 따라가요.
//  · 로그인은 "이번 학년도" 반의 학번으로 찾아요.

import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: boolean; message: string };


async function classYear(classId: string) {
  const { data } = await createAdminClient()
    .from("classes")
    .select("id, grade, class_no, school_year_id, school_years!inner(year, school_id)")
    .eq("id", classId)
    .maybeSingle();
  if (!data) return null;
  const sy = data.school_years as unknown as { year: number; school_id: string };
  return { id: data.id, grade: data.grade, classNo: data.class_no, schoolYearId: data.school_year_id, year: sy.year, schoolId: sy.school_id };
}

/** 그 학년도에 이미 반이 있는 학생 */
async function enrolledIn(schoolYearId: string, studentIds: string[]) {
  if (!studentIds.length) return new Set<string>();
  const { data } = await createAdminClient()
    .from("enrollments")
    .select("student_id, classes!inner(school_year_id)")
    .in("student_id", studentIds)
    .eq("classes.school_year_id", schoolYearId);
  return new Set((data ?? []).map((e) => e.student_id));
}

/**
 * 반 전체 옮기기. 번호는 그대로.
 *  · 지난 학년도 반 → 새 학년도 반: 진급 (예전 반 배정은 기록으로 남김)
 *  · 같은 학년도 반끼리: 이동 (반 배정을 바꿈)
 */
export async function promoteClassCore(schoolId: string, fromId: string, toId: string): Promise<Result> {
  const from = await classYear(fromId);
  const to = await classYear(toId);
  if (!from || !to || from.schoolId !== schoolId || to.schoolId !== schoolId) return { ok: false, message: "반을 찾을 수 없어요." };
  if (from.id === to.id) return { ok: false, message: "다른 반을 골라 주세요." };
  if (to.year < from.year) return { ok: false, message: "지난 학년도 반으로는 옮길 수 없어요." };

  const admin = createAdminClient();
  const { data: roster } = await admin.from("enrollments").select("id, student_id, number").eq("class_id", from.id);
  const { data: taken } = await admin.from("enrollments").select("number").eq("class_id", to.id);
  const usedNumbers = new Set((taken ?? []).map((e) => e.number));
  const promote = to.year > from.year;
  const already = promote ? await enrolledIn(to.schoolYearId, (roster ?? []).map((r) => r.student_id)) : new Set<string>();

  let moved = 0;
  const skipped: number[] = [];
  for (const r of roster ?? []) {
    if (usedNumbers.has(r.number) || already.has(r.student_id)) {
      skipped.push(r.number);
      continue;
    }
    const { error } = promote
      ? await admin.from("enrollments").insert({ student_id: r.student_id, class_id: to.id, number: r.number })
      : await admin.from("enrollments").update({ class_id: to.id }).eq("id", r.id);
    if (error) skipped.push(r.number);
    else {
      moved++;
      usedNumbers.add(r.number);
    }
  }
  const verb = promote ? "진급했어요" : "옮겼어요";
  const note = skipped.length ? ` (번호가 겹치거나 이미 반이 있어서 건너뜀: ${skipped.sort((a, b) => a - b).join(", ")}번)` : "";
  return {
    ok: true,
    message: `${moved}명을 ${to.year}학년도 ${to.grade}학년 ${to.classNo}반으로 ${verb}.${note} 학생은 새 학번으로 로그인하고, 그림 비밀번호와 기록은 그대로예요.`,
  };
}

/** 한 명 옮기기 (전학·반 배정 고치기). 새 학년도 반이면 진급, 같은 학년도면 이동 */
export async function moveStudentCore(schoolId: string, fromId: string, toId: string, studentId: string, number: number): Promise<Result> {
  const from = await classYear(fromId);
  const to = await classYear(toId);
  if (!from || !to || from.schoolId !== schoolId || to.schoolId !== schoolId) return { ok: false, message: "반을 찾을 수 없어요." };
  if (!(number >= 1 && number <= 50)) return { ok: false, message: "번호는 1~50 사이로 적어 주세요." };
  if (to.year < from.year) return { ok: false, message: "지난 학년도 반으로는 옮길 수 없어요." };

  const admin = createAdminClient();
  const { data: enr } = await admin.from("enrollments").select("id").eq("class_id", from.id).eq("student_id", studentId).maybeSingle();
  if (!enr) return { ok: false, message: "이 반 학생이 아니에요." };
  const { data: clash } = await admin.from("enrollments").select("id").eq("class_id", to.id).eq("number", number).maybeSingle();
  if (clash && clash.id !== enr.id) return { ok: false, message: `${to.classNo}반에 ${number}번이 이미 있어요.` };

  const promote = to.year > from.year;
  if (promote && (await enrolledIn(to.schoolYearId, [studentId])).size) return { ok: false, message: `이 학생은 ${to.year}학년도에 이미 반이 있어요.` };
  const { error } = promote
    ? await admin.from("enrollments").insert({ student_id: studentId, class_id: to.id, number })
    : await admin.from("enrollments").update({ class_id: to.id, number }).eq("id", enr.id);
  if (error) return { ok: false, message: "옮기지 못했어요. 다시 해 주세요." };
  return {
    ok: true,
    message: `${to.year}학년도 ${to.grade}학년 ${to.classNo}반 ${number}번으로 ${promote ? "진급했어요" : "옮겼어요"}. 새 학번: ${to.grade}${String(to.classNo).padStart(2, "0")}${String(number).padStart(2, "0")}`,
  };
}
