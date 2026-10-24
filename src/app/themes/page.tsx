import Link from "next/link";

// 테마 시안 목록. 하나를 고르면 DESIGN.md를 그 테마 하나로 정리합니다.
const THEMES = [
  {
    id: "poster",
    name: "A · 픽셀 포스터",
    ref: "낭만수집단",
    desc: "하늘→민트 계단 그라데이션, 체크무늬, 연두 외곽선 타이틀, 검은 라벨, 크림 토끼와 연두 풍선. 밝고 귀여운 이벤트 포스터 느낌.",
    swatch: ["#3fa9f5", "#8ff0d8", "#b6f05a", "#111111", "#fff6d6"],
  },
  {
    id: "crt",
    name: "B · CRT 레트로",
    ref: "Retrobit",
    desc: "어두운 방의 브라운관 TV, 하늘색 단색 팔레트, 굵은 남색 타이틀과 주사선. 차분하고 '게임기 켜는' 느낌.",
    swatch: ["#15171c", "#9cc8f2", "#dcecfb", "#2440a8", "#ffffff"],
  },
  {
    id: "desktop",
    name: "C · Y2K 바탕화면",
    ref: "선물하기로 놀러오r..",
    desc: "파란 하늘과 초원 바탕화면, 윈도우 98 창, 바탕화면 아이콘, 흰 외곽 연두 글자. 싸이월드 시절 컴퓨터 느낌.",
    swatch: ["#2a6fd6", "#4ea323", "#d4d0c8", "#0a246a", "#7ed321"],
  },
  {
    id: "mix",
    name: "D · 포스터 × 바탕화면",
    ref: "A + C 섞기",
    desc: "A의 계단 하늘·체크무늬·토끼와 풍선을 바탕화면으로 깔고, 그 위에 C의 윈도우 98 창과 바탕화면 아이콘을 올림. 창 안은 A의 연두 타이틀과 검은 라벨.",
    swatch: ["#3fa9f5", "#8ff0d8", "#d4d0c8", "#0a246a", "#b6f05a"],
  },
] as const;

export default function ThemeIndex() {
  return (
    <main className="flex-1 bg-[#f4f4f0] px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-title text-title text-navy-900">테마 시안 4종</h1>
        <p className="mt-2 font-pixel text-body text-text-muted">
          각 시안은 레퍼런스 하나만 따릅니다. 모두 같은 구성(첫 화면 · 타자 영역 · 보상)이라 테마 차이만 비교할 수 있어요.
        </p>
        <ul className="mt-8 grid gap-6 md:grid-cols-2">
          {THEMES.map((t) => (
            <li key={t.id}>
              <Link
                href={`/themes/${t.id}`}
                className="flex h-full flex-col border-3 border-navy-900 bg-paper p-5 shadow-pixel-md hover:-translate-y-0.5 hover:shadow-pixel-lg"
              >
                <div className="flex h-10">
                  {t.swatch.map((c) => (
                    <span key={c} className="flex-1" style={{ background: c }} />
                  ))}
                </div>
                <h2 className="mt-4 font-pixel text-heading font-bold text-navy-900">{t.name}</h2>
                <p className="font-pixel text-small text-text-muted">레퍼런스: {t.ref}</p>
                <p className="mt-3 font-sans text-body leading-relaxed text-navy-900">{t.desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
