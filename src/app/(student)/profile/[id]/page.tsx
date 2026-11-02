import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireStudent } from "@/lib/auth/viewer";
import { classmates, loadProfile } from "@/lib/profile/server";
import { ProfileView } from "../ProfileView";

/** 반 친구 프로필 (같은 반 친구와 선생님만 볼 수 있어요) */
async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const v = await requireStudent();
  const { id } = await params;
  if (id === v.userId) redirect("/profile");
  const [p, mates] = await Promise.all([/^[0-9a-f-]{36}$/.test(id) ? loadProfile(v, id) : null, classmates(v)]);
  if (!p) {
    return (
      <RetroWindow title="앗!" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">우리 반 친구의 프로필만 볼 수 있어요.</p>
        <PixelLink href="/profile" size="sm" variant="success" className="mt-4">
          내 프로필로
        </PixelLink>
      </RetroWindow>
    );
  }
  return <ProfileView p={p} mates={mates} />;
}

export default function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        <Suspense fallback={<Loading />}>
          <Content params={params} />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
