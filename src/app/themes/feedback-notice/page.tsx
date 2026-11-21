import { notFound } from "next/navigation";
import { FeedbackNoticePreview } from "./FeedbackNoticePreview";

// 선생님 확인용 미리보기: 건의가 반영된 학생이 홈에서 보는 알림 창 (이 컴퓨터에서 개발할 때만 열려요)
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FeedbackNoticePreview />;
}
