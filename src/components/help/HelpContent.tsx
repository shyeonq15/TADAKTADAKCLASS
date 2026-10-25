// 학생용 설명 글. [?] 버튼과 도움말 페이지가 같이 씁니다.
// 숫자는 모두 config/game.ts 에서 읽어서, 기준을 바꾸면 설명도 자동으로 바뀌어요.

import {
  COINS,
  GAME_COINS,
  GAMES,
  GROWTH,
  LEVEL_CLEAR,
  MISSION,
  PLACEMENT,
  TIER_LABELS,
  TIER_MIN_CPM,
  TIER_RULES,
  TIERS,
  TRACK_LABELS,
  TRACKS,
} from "@/config/game";
import { TierBadge } from "@/components/ui/TierBadge";

function Box({ children }: { children: React.ReactNode }) {
  return <div className="my-3 border-3 border-navy-900 bg-paper px-4 py-3">{children}</div>;
}

export function GrowthHelp() {
  return (
    <>
      <p>
        성장 점수는 <strong>얼마나 빠른지가 아니라, 어제의 나보다 얼마나 나아졌는지</strong>로 매겨요. 그래서 지금 느린 친구도
        빠른 친구와 똑같이 점수를 받을 수 있어요.
      </p>
      <Box>
        <ul className="list-disc pl-5">
          <li>
            <strong>미션 참여</strong> · 오늘의 미션을 끝내면 {GROWTH.participation.points}점
          </li>
          <li>
            <strong>속도 향상</strong> · 내 기준보다 1% 빨라질 때마다 1점 (최대 {GROWTH.speed.max}점)
          </li>
          <li>
            <strong>정확도 향상</strong> · 내 기준보다 정확도가 1%p 오를 때마다 1점 (최대 {GROWTH.accuracy.max}점)
          </li>
          <li>
            <strong>연속 연습</strong> · 연속으로 연습한 날 × {GROWTH.streak.pointsPerDay}점 (최대 {GROWTH.streak.max}점)
          </li>
          <li>
            <strong>레벨 첫 클리어</strong> · 새 레벨을 처음 통과하면 {GROWTH.levelFirstClear.points}점
          </li>
        </ul>
        <p className="mt-2">
          하루 최대 <strong>{GROWTH.dailyCap}점</strong>까지 모을 수 있어요.
        </p>
      </Box>
      <p>
        <strong>내 기준</strong>은 같은 트랙·레벨에서 <strong>최근 {GROWTH.baselineSampleSize}판 기록의 가운데 값</strong>이에요.
        평균이 아니라 가운데 값이라서, 한 판을 일부러 천천히 쳐도 기준이 거의 안 바뀌어요.
      </p>
      <p className="mt-2">
        ⚠️ 정확도가 <strong>{GROWTH.minAccuracyForSpeed}% 아래</strong>면 속도 점수는 0점이에요. 빨리 치는 것보다 정확하게 치는 게
        먼저예요!
      </p>
      <p className="mt-2">
        💡 10타 → 12타도 <strong>20% 향상</strong>이에요. 처음 시작하는 친구일수록 점수가 쑥쑥 올라요.
      </p>
      <p className="mt-2">우리 반 친구들의 성장 점수 평균이 <strong>반 점수</strong>가 돼요. 2주마다 반 대결 결과가 나와요.</p>
    </>
  );
}

export function TierHelp() {
  return (
    <>
      <p>
        티어는 <strong>지금 내 실력</strong>을 보여 주는 명예 배지예요. 트랙(한글·영타·기호·코드)마다 따로 있어요. 성장 점수와는
        별개라서, 티어가 낮아도 성장 점수는 많이 받을 수 있어요.
      </p>
      <Box>
        <table className="w-full font-sans text-small">
          <thead>
            <tr className="border-b-2 border-navy-900 text-left">
              <th className="py-1">티어</th>
              {TRACKS.map((t) => (
                <th key={t} className="py-1 text-right">
                  {TRACK_LABELS[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIERS.map((tier) => (
              <tr key={tier} className="border-b border-win-shadow">
                <td className="py-1">
                  <TierBadge tier={tier} />
                </td>
                {TRACKS.map((t) => (
                  <td key={t} className="py-1 text-right">
                    {TIER_MIN_CPM[t][tier]}타~
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      <ul className="list-disc pl-5">
        <li>
          정확도 <strong>{TIER_RULES.minAccuracy}% 이상</strong>인 기록만 인정해요.
        </li>
        <li>
          기준 타수를 넘은 기록이 <strong>{TIER_RULES.recordsToPromote}번</strong> 쌓이면 올라가요. (한 번 운 좋게 빨랐던 걸로는 안
          올라가요)
        </li>
        <li>
          학기 중에는 <strong>티어가 내려가지 않아요.</strong> 마음 놓고 도전해요!
        </li>
        <li>
          <strong>코드</strong> 트랙에서 {TIER_LABELS.diamond}가 되면 특별 칭호 <TierBadge tier="diamond" codeMaster />를 받아요.
        </li>
        <li>프로필에는 네 트랙 중 가장 높은 티어가 보여요. 게임 기록은 티어에 들어가지 않아요.</li>
      </ul>
    </>
  );
}

export function LevelHelp() {
  return (
    <>
      <p>
        트랙마다 레벨이 있고, 레벨을 <strong>통과</strong>하면 다음 레벨이 열려요.
      </p>
      <Box>
        통과 조건: <strong>정확도 {LEVEL_CLEAR.minAccuracy}% 이상</strong> + <strong>레벨마다 정해진 타수 이상</strong> (트랙 맵의
        핀 아래에 적혀 있어요)
      </Box>
      <p>
        처음에 한 <strong>배치 테스트</strong>({PLACEMENT.secondsPerTrack}초 × 4트랙) 결과로, 이미 잘하는 트랙은 높은 레벨부터
        시작했어요.
      </p>
    </>
  );
}

export function CoinHelp() {
  return (
    <>
      <p>코인은 연습하고 도전할 때마다 모여요. 개인 지갑과 우리 반 지갑이 있어요.</p>
      <Box>
        <ul className="list-disc pl-5">
          <li>연습 한 판 · {COINS.practiceRound}코인</li>
          <li>개인 기록 갱신 · {COINS.personalBest}코인</li>
          <li>
            오늘의 미션 완료({MISSION.rounds}판) · 나에게 {COINS.missionPersonal}코인 + 우리 반 지갑에 {COINS.missionClass}코인
          </li>
          <li>
            단어 비 한 판 · {GAME_COINS.play}코인, 최고 점수 갱신 · {GAME_COINS.best}코인
          </li>
        </ul>
      </Box>
      <p>개인 코인으로는 미니미 꾸미기, 반 코인으로는 우리 반 미니룸 꾸미기를 할 수 있게 될 거예요. (준비 중)</p>
      <p className="mt-2">이상하게 빠른 기록은 선생님이 확인한 뒤에 코인이 들어와요.</p>
    </>
  );
}

export function RainHelp() {
  return (
    <ul className="list-disc pl-5">
      <li>떨어지는 단어를 똑같이 치고 Enter(한글·영타는 Space도 돼요)를 누르면 터져요.</li>
      <li>단어가 바닥에 닿으면 하트가 하나 줄어요. 하트 {GAMES.rain.hearts}개가 다 없어지면 끝!</li>
      <li>{GAMES.rain.hitsPerStage}개 터뜨릴 때마다 단계가 올라가서 더 빨라져요.</li>
      <li>
        연속으로 맞히면 콤보! 콤보 {GAMES.rain.comboStep}개마다 점수가 {GAMES.rain.comboBonus * 100}%씩 더 붙어요.
      </li>
      <li>게임 기록도 성장 점수에 들어가요. 단어 비끼리 내 최근 기록과 비교해요.</li>
    </ul>
  );
}

export const HELP_SECTIONS = [
  { id: "growth", title: "성장 점수", Body: GrowthHelp },
  { id: "tier", title: "티어", Body: TierHelp },
  { id: "level", title: "레벨과 배치 테스트", Body: LevelHelp },
  { id: "coin", title: "코인", Body: CoinHelp },
  { id: "rain", title: "단어 비", Body: RainHelp },
] as const;
