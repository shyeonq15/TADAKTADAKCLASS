import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { bossRanks, listBosses } from "@/lib/games/boss";
import { loadShop } from "@/lib/shop/server";
import { BossGame } from "./BossGame";

async function Content() {
  await connection();
  const v = await requireStudent();
  const [bosses, shop, ranks] = await Promise.all([listBosses(v.userId, v.schoolId), loadShop(v.userId), bossRanks([v.userId])]);
  return <BossGame bosses={bosses} myLook={shop.look} myTier={ranks.get(v.userId)?.tier ?? null} />;
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
