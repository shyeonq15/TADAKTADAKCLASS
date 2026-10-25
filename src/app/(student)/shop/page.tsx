import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { loadShop } from "@/lib/shop/server";
import { ShopScreen } from "./ShopScreen";

async function Content() {
  await connection();
  const v = await requireStudent();
  return <ShopScreen initial={await loadShop(v.userId)} />;
}

export default function ShopPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="title-lime mb-6 text-center text-title">미니미 상점</h1>
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
