import { Suspense } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { Loading } from "@/components/ui/Loading";
import { requireTeacher } from "@/lib/auth/viewer";
import { BossRecorder } from "./BossRecorder";

async function Gate() {
  await requireTeacher();
  return (
    <ClientOnly fallback={<Loading />}>
      <BossRecorder />
    </ClientOnly>
  );
}

export default function BossRecordPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-title text-title text-paper">보스 기록 만들기</h1>
      <Suspense fallback={<Loading />}>
        <Gate />
      </Suspense>
    </div>
  );
}
