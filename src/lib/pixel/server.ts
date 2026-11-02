import "server-only";

// 픽셀 아트 저장·우리 반 갤러리 (서버 전용)

import { PIXEL_LIMITS, validPixelRows, type PixelBits } from "@/config/pixel";
import { createAdminClient } from "@/lib/supabase/admin";

export type PixelArt = { id: string; title: string; bits: PixelBits; rows: string[]; nickname: string; mine: boolean; at: string };

const missing = (e: { code?: string } | null) => !!e && ["42P01", "PGRST205"].includes(e.code ?? "");
const BANNED = ["시발", "씨발", "병신", "개새", "존나", "좆", "fuck", "shit", "바보", "멍청"];

export async function savePixelArt(
  who: { userId: string; classId: string | null },
  input: { title: string; bits: number; rows: unknown },
): Promise<{ ok: true } | { error: string }> {
  const bits: PixelBits = input.bits === 4 ? 4 : input.bits === 2 ? 2 : 1;
  if (!validPixelRows(input.rows, bits)) return { error: "16줄 모두 숫자 16개씩 채워 주세요." };
  const title = String(input.title ?? "").trim().slice(0, 20) || "제목 없음";
  if (BANNED.some((w) => title.toLowerCase().replace(/\s/g, "").includes(w))) return { error: "친구가 기분 좋을 제목으로 바꿔 볼까요?" };
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 3600000).toISOString();
  const { count, error: ce } = await admin.from("pixel_arts").select("id", { count: "exact", head: true }).eq("student_id", who.userId).gte("created_at", since);
  if (missing(ce)) return { error: "픽셀 갤러리를 준비 중이에요. 선생님께 알려 주세요!" };
  if ((count ?? 0) >= PIXEL_LIMITS.perDay) return { error: `하루에 ${PIXEL_LIMITS.perDay}개까지 걸 수 있어요. 내일 또 그려요!` };
  const { error } = await admin.from("pixel_arts").insert({ student_id: who.userId, class_id: who.classId, title, bits, rows: input.rows });
  if (error)
    return { error: error.code === "23514" ? "4비트 그림을 걸려면 선생님이 SQL(20261102000006)을 실행해야 해요. 1·2비트로 걸어 볼까요?" : "저장하지 못했어요. 다시 해 주세요." };
  return { ok: true };
}

export async function loadClassGallery(classId: string, myId: string): Promise<PixelArt[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pixel_arts")
    .select("id, title, bits, rows, student_id, created_at, profiles!inner(nickname)")
    .eq("class_id", classId)
    .order("created_at", { ascending: false })
    .limit(PIXEL_LIMITS.gallery);
  if (error) return [];
  type Row = { id: string; title: string; bits: number; rows: string[]; student_id: string; created_at: string; profiles: { nickname: string | null } };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    bits: (r.bits === 4 ? 4 : r.bits === 2 ? 2 : 1) as PixelBits,
    rows: r.rows,
    nickname: r.profiles.nickname ?? "친구",
    mine: r.student_id === myId,
    at: r.created_at,
  }));
}

/** 그림 내리기: 그린 학생 본인, 또는 선생님(학교 확인은 부르는 쪽에서) */
export async function deletePixelArt(id: string, by: { studentId?: string; classId?: string }) {
  let q = createAdminClient().from("pixel_arts").delete().eq("id", id);
  if (by.studentId) q = q.eq("student_id", by.studentId);
  if (by.classId) q = q.eq("class_id", by.classId);
  await q;
}
