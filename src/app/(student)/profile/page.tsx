import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { classmates, loadProfile } from "@/lib/profile/server";
import { ProfileView } from "./ProfileView";

async function Content() {
  await connection();
  const v = await requireStudent();
  if (v.role === "teacher") redirect("/teacher"); // 선생님은 프로필이 없어요
  const [p, mates] = await Promise.all([loadProfile(v, v.userId), classmates(v)]);
  if (!p) redirect("/");
  return <ProfileView p={p} mates={mates} />;
}

export default function ProfilePage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
