import "server-only";

// 선생님 테스트 계정 (반마다 TEST_ACCOUNT.number 번 학생). config/game.ts 참고

import { cache } from "react";
import { TEST_ACCOUNT } from "@/config/game";
import { schoolYearOf } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

export const isTestNumber = (n: number | null | undefined) => n === TEST_ACCOUNT.number;

/** 이 학생이 이번 학년도에 테스트 번호로 등록돼 있는지 (한 요청 안에서는 한 번만 확인) */
export const isTestStudent = cache(async (userId: string): Promise<boolean> => {
  const { data } = await createAdminClient()
    .from("enrollments")
    .select("number, classes!inner(school_years!inner(year))")
    .eq("student_id", userId)
    .eq("number", TEST_ACCOUNT.number)
    .eq("classes.school_years.year", schoolYearOf())
    .limit(1);
  return (data ?? []).length > 0;
});
