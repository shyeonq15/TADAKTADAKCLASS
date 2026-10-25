"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { schoolYearOf } from "@/lib/auth/config";
import { checkNickname } from "@/lib/auth/nickname";
import { getViewer } from "@/lib/auth/viewer";

export type OnboardState = { message: string } | null;

/** 첫 접속: (구글 학생) 반 코드로 반 들어가기 + 닉네임 정하기 */
export async function saveOnboarding(_: OnboardState, formData: FormData): Promise<OnboardState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "student") redirect("/teacher");

  const admin = createAdminClient();
  let classId = viewer.enrollment?.classId ?? null;

  if (!classId) {
    const code = String(formData.get("code") ?? "").trim().toUpperCase();
    const number = Number(formData.get("number"));
    if (!code || !Number.isInteger(number) || number < 1 || number > 50) {
      return { message: "반 코드와 번호를 확인해 주세요." };
    }
    const { data: cls } = await admin
      .from("classes")
      .select("id, school_years!inner(year, school_id)")
      .eq("join_code", code)
      .eq("school_years.year", schoolYearOf())
      .maybeSingle();
    const sy = cls?.school_years as unknown as { school_id: string } | undefined;
    if (!cls || sy?.school_id !== viewer.schoolId) return { message: "그런 반 코드가 없어요. 선생님께 다시 물어봐 주세요." };

    const { error } = await admin.from("enrollments").insert({ student_id: viewer.userId, class_id: cls.id, number });
    if (error) return { message: "그 번호는 이미 다른 친구가 쓰고 있어요. 번호를 확인해 주세요." };
    classId = cls.id;
  }

  const nick = checkNickname(String(formData.get("nickname") ?? ""));
  if (!nick.ok) return { message: nick.message };

  // 같은 반에 같은 닉네임이 있으면 안 됨
  const { data: mates } = await admin
    .from("enrollments")
    .select("student_id, profiles!inner(nickname)")
    .eq("class_id", classId)
    .neq("student_id", viewer.userId)
    .eq("profiles.nickname", nick.value);
  if (mates && mates.length > 0) return { message: "우리 반에 같은 닉네임이 있어요. 다른 닉네임을 골라 주세요." };

  await admin.from("profiles").update({ nickname: nick.value }).eq("id", viewer.userId);
  // 처음이면 배치 테스트부터 (이미 했으면 배치 화면이 결과만 보여줌)
  redirect("/placement");
}
