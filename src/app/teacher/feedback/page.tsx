import { connection } from "next/server";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireTeacher } from "@/lib/auth/viewer";
import { FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS, loadSchoolFeedback, type FeedbackStatus } from "@/lib/feedback/server";
import { saveFeedback } from "./actions";

const STATUS_CLASS: Record<FeedbackStatus, string> = { new: "bg-yellow-400", seen: "bg-sky-200", done: "bg-lime-400" };

async function List() {
  await connection(); // 로그인은 요청마다 새로 확인
  const t = await requireTeacher();
  const { items, ready } = await loadSchoolFeedback(t.schoolId);
  const fresh = items.filter((f) => f.status === "new").length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-title text-title text-paper">건의함 {fresh > 0 && <span className="text-yellow-400">· 새 글 {fresh}개</span>}</h1>
      {!ready && (
        <RetroWindow title="처음 한 번 준비가 필요해요">
          <p className="text-body">
            Supabase 대시보드 → SQL Editor 에서 <code>supabase/migrations/20261102000001_profile_feedback.sql</code> 내용을 붙여 넣고 Run 해 주세요.
          </p>
        </RetroWindow>
      )}
      <RetroWindow title={`학생 건의 (${items.length})`}>
        <p className="mb-3 text-small text-text-muted">
          학생이 보낸 버그 제보·아이디어예요. 실명은 선생님 화면에서만 보여요. 답장을 쓰면 학생의 &ldquo;내가 보낸 글&rdquo;에 보여요.
        </p>
        {items.length === 0 ? (
          <p className="text-body">아직 건의가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((f) => (
              <li key={f.id} className="win-bevel-pressed bg-paper px-3 py-2 text-body">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-small">
                  <strong>{FEEDBACK_KIND_LABELS[f.kind]}</strong>
                  <span className={`border-2 border-navy-900 px-2 ${STATUS_CLASS[f.status]}`}>{FEEDBACK_STATUS_LABELS[f.status]}</span>
                  <span>
                    {f.classLabel}반 · {f.realName ?? "-"} ({f.nickname})
                  </span>
                  {f.page && <span className="text-text-muted">화면: {f.page}</span>}
                  <span className="ml-auto text-text-muted">{new Date(f.at).toLocaleString("ko-KR")}</span>
                </div>
                <p className="whitespace-pre-wrap break-words">{f.body}</p>
                <form action={saveFeedback} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={f.id} />
                  <input
                    name="reply"
                    defaultValue={f.reply ?? ""}
                    maxLength={500}
                    placeholder="답장 (학생에게 보여요)"
                    className="win-bevel-pressed h-9 min-w-0 flex-1 bg-paper px-2 text-small outline-none"
                  />
                  <select name="status" defaultValue={f.status} className="win-bevel h-9 px-2 text-small">
                    {(Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {FEEDBACK_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <button className="win-bevel h-9 px-3 text-small active:win-bevel-pressed">저장</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </RetroWindow>
    </div>
  );
}

export default function TeacherFeedbackPage() {
  return (
    <Suspense fallback={<Loading />}>
      <List />
    </Suspense>
  );
}
