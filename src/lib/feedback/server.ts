import "server-only";

// 건의함 (서버 전용): 학생이 버그·아이디어를 보내면 선생님 화면에 모여요. 선생님은 확인 표시와 답장을 할 수 있어요.

import { createAdminClient } from "@/lib/supabase/admin";

export type FeedbackKind = "bug" | "idea";
export type FeedbackStatus = "new" | "seen" | "done";

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = { bug: "🐞 버그 제보", idea: "💡 아이디어" };
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = { new: "새 글", seen: "선생님이 읽었어요", done: "반영했어요!" };

/** 한 학생이 하루에 보낼 수 있는 건의 수 (장난 글 도배 막기) */
const DAILY_LIMIT = 10;

export type MyFeedback = { id: string; kind: FeedbackKind; body: string; status: FeedbackStatus; reply: string | null; at: string };
export type TeacherFeedback = MyFeedback & { page: string | null; nickname: string; realName: string | null; classLabel: string };

/** 표가 아직 없을 때 (선생님이 SQL 을 아직 실행하지 않음) */
const NOT_READY = "건의함을 준비 중이에요. 선생님께 알려 주세요!";
const missingTable = (e: { code?: string } | null) => e?.code === "42P01" || e?.code === "PGRST205";

export async function sendFeedback(
  v: { userId: string; schoolId: string; classId: string | null },
  input: { kind: string; body: string; page?: string },
): Promise<{ ok: true } | { error: string }> {
  const kind: FeedbackKind = input.kind === "bug" ? "bug" : "idea";
  const body = String(input.body ?? "").trim().slice(0, 1000);
  if (body.length < 2) return { error: "두 글자 이상 써 주세요." };
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 3600000).toISOString();
  const { count, error: countError } = await admin
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("student_id", v.userId)
    .gte("created_at", since);
  if (missingTable(countError)) return { error: NOT_READY };
  if ((count ?? 0) >= DAILY_LIMIT) return { error: `하루에 ${DAILY_LIMIT}개까지 보낼 수 있어요. 내일 또 보내 주세요!` };
  const { error } = await admin.from("feedback").insert({
    school_id: v.schoolId,
    student_id: v.userId,
    class_id: v.classId,
    kind,
    body,
    page: String(input.page ?? "").slice(0, 200) || null,
  });
  if (error) return { error: missingTable(error) ? NOT_READY : "보내지 못했어요. 다시 해 주세요." };
  return { ok: true };
}

export async function loadMyFeedback(userId: string): Promise<{ items: MyFeedback[]; ready: boolean }> {
  const { data, error } = await createAdminClient()
    .from("feedback")
    .select("id, kind, body, status, reply, created_at")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return { items: [], ready: !missingTable(error) };
  return {
    ready: true,
    items: (data ?? []).map((f) => ({ id: f.id, kind: f.kind, body: f.body, status: f.status, reply: f.reply, at: f.created_at })),
  };
}

export async function loadSchoolFeedback(schoolId: string): Promise<{ items: TeacherFeedback[]; ready: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("feedback")
    .select("id, kind, body, status, reply, page, created_at, student_id, class_id")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { items: [], ready: !missingTable(error) };
  const studentIds = [...new Set((data ?? []).map((f) => f.student_id).filter(Boolean))] as string[];
  const classIds = [...new Set((data ?? []).map((f) => f.class_id).filter(Boolean))] as string[];
  const [{ data: people }, { data: classes }] = await Promise.all([
    studentIds.length ? admin.from("profiles").select("id, nickname, real_name").in("id", studentIds) : Promise.resolve({ data: [] }),
    classIds.length ? admin.from("classes").select("id, grade, class_no").in("id", classIds) : Promise.resolve({ data: [] }),
  ]);
  const person = new Map((people ?? []).map((p) => [p.id, p]));
  const cls = new Map((classes ?? []).map((c) => [c.id, `${c.grade}-${c.class_no}`]));
  return {
    ready: true,
    items: (data ?? []).map((f) => ({
      id: f.id,
      kind: f.kind,
      body: f.body,
      status: f.status,
      reply: f.reply,
      at: f.created_at,
      page: f.page,
      nickname: person.get(f.student_id)?.nickname ?? "(나간 학생)",
      realName: person.get(f.student_id)?.real_name ?? null,
      classLabel: cls.get(f.class_id) ?? "-",
    })),
  };
}

export async function updateFeedback(schoolId: string, id: string, patch: { status?: string; reply?: string }) {
  const update: { status?: FeedbackStatus; reply?: string | null } = {};
  if (patch.status === "new" || patch.status === "seen" || patch.status === "done") update.status = patch.status;
  if (patch.reply !== undefined) update.reply = patch.reply.trim().slice(0, 500) || null;
  if (update.reply && !update.status) update.status = "seen";
  await createAdminClient().from("feedback").update(update).eq("id", id).eq("school_id", schoolId);
}
