"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/viewer";
import { updateFeedback } from "@/lib/feedback/server";

/** 건의 상태 바꾸기·답장 (폼에서 부름) */
export async function saveFeedback(formData: FormData) {
  const v = await getViewer();
  if (v?.role !== "teacher") return;
  const reply = formData.get("reply");
  await updateFeedback(v.schoolId, String(formData.get("id")), {
    status: formData.get("status") ? String(formData.get("status")) : undefined,
    reply: reply === null ? undefined : String(reply),
  });
  revalidatePath("/teacher/feedback");
}
