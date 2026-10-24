import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";

// 임시 첫 화면: 디자인 토큰·폰트·컴포넌트가 제대로 나오는지 확인하는 용도.
// 로그인과 반 미니룸이 생기면 이 화면을 교체합니다.
export default function Home() {
  return (
    <main className="bg-sky-checker flex flex-1 flex-col items-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="title-lime text-hero">타닥타닥 우리반</h1>
        <p className="mt-2 font-title text-body tracking-widest text-navy-900">TADAK TADAK CLASS</p>
      </div>

      <MissionLabel keyword="MISSION">오늘은 괄호 친구들을 만나러 가요</MissionLabel>

      <div className="flex flex-wrap justify-center gap-4">
        <PixelButton>시작하기</PixelButton>
        <PixelButton variant="success">미션 시작</PixelButton>
        <PixelButton variant="reward">보상 받기</PixelButton>
        <PixelButton variant="ghost">취소</PixelButton>
      </div>

      <RetroWindow title="폰트 확인.txt" className="w-full max-w-2xl">
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3">
          <dt className="text-small text-text-muted">Neo둥근모</dt>
          <dd className="font-title text-title">타닥타닥 32px</dd>
          <dt className="text-small text-text-muted">갈무리11</dt>
          <dd className="font-pixel text-heading">우리 반이 함께 레벨업</dd>
          <dt className="text-small text-text-muted">D2Coding</dt>
          <dd className="bg-surface px-2 font-typing text-typing-code">{"print(\"Hello\") # 0O l1 '`"}</dd>
          <dt className="text-small text-text-muted">Pretendard</dt>
          <dd className="font-sans text-body">교사 대시보드: 1반 28명 중 24명 완료</dd>
        </dl>
      </RetroWindow>

      <div className="w-full max-w-2xl">
        <DialogBox text="코인 30개를 획득했다!" />
      </div>
    </main>
  );
}
