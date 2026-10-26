import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { listBosses } from "@/lib/games/boss";
import { loadShop } from "@/lib/shop/server";
import { BossGame } from "./BossGame";

async function Content() {
  await connection();
  const v = await requireStudent();
  const [bosses, shop] = await Promise.all([listBosses(v.userId, v.schoolId), loadShop(v.userId)]);
  return <BossGame bosses={bosses} myLook={shop.look} />;
}

export default function BossPage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-6">
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
