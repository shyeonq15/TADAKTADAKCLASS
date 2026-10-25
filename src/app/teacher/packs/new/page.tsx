import { Suspense } from "react";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireTeacher } from "@/lib/auth/viewer";
import { NewPackForm } from "./NewPackForm";

async function Gate() {
  await requireTeacher();
  return <NewPackForm />;
}

export default function NewPackPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-title text-title text-paper">새 연습팩 만들기</h1>
      <RetroWindow title="글 붙여 넣기">
        <Suspense fallback={<Loading />}>
          <Gate />
        </Suspense>
      </RetroWindow>
    </div>
  );
}
