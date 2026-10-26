// 학생용 설명 글. [?] 버튼과 도움말 페이지가 같이 씁니다.
// 숫자는 모두 config/game.ts 에서 읽어서, 기준을 바꾸면 설명도 자동으로 바뀌어요.

import {
  CLASS_BATTLE,
  COINS,
  GAME_COINS,
  GAMES,
  GROWTH,
  MISSION,
  PLACEMENT,
  RACE,
  STAGE_ACCURACY,
  STAGE_PLAN,
  STEPS_PER_TIER,
  TIER_LABELS,
  TIERS,
  TRACK_LABELS,
  TRACKS,
} from "@/config/game";
import { TierBadge } from "@/components/ui/TierBadge";
import { MINIMI_ITEMS, ROOM } from "@/config/shop";
import { lockLabel } from "@/lib/shop/lock";

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
        연습 트랙은 <strong>티어 6개 × 5단계</strong>로 되어 있어요. 트랙(한글·영타·기호·코드)마다 따로예요.
      </p>
      <Box>
        <p>
          🟫 브론즈 1 → 2 → 3 → 4 → 5 단계를 <strong>다 깨면 → 실버로 승급!</strong>
        </p>
        <p>실버 5단계를 다 깨면 → 골드, 그다음 다이아 → 마스터 → 레전드까지 올라가요.</p>
      </Box>
      <p>각 티어의 목표 타수 (1단계 → 5단계)</p>
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
              <th className="py-1 text-right">정확도</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((tier, ti) => (
              <tr key={tier} className="border-b border-win-shadow">
                <td className="py-1">
                  <TierBadge tier={tier} />
                </td>
                {TRACKS.map((t) => {
                  const steps = STAGE_PLAN[t].slice(ti * STEPS_PER_TIER, (ti + 1) * STEPS_PER_TIER);
                  return (
                    <td key={t} className="py-1 text-right">
                      {steps[0][1]}~{steps[steps.length - 1][1]}타
                    </td>
                  );
                })}
                <td className="py-1 text-right">{STAGE_ACCURACY[tier]}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      <ul className="list-disc pl-5">
        <li>티어가 높을수록 글이 어려워져요. 자리 연습 → 낱말 → 문장 → 긴 문장 → 문단 → 정보 이야기 순서예요.</li>
        <li>한 번 올라간 티어는 내려가지 않아요. 마음 놓고 도전해요!</li>
        <li>
          <strong>코드</strong> 트랙에서 {TIER_LABELS.diamond}에 오르면 특별 칭호 <TierBadge tier="diamond" codeMaster />를 받아요.
        </li>
        <li>프로필에는 네 트랙 중 가장 높은 티어가 보여요.</li>
      </ul>
    </>
  );
}

export function LevelHelp() {
  return (
    <>
      <p>
        단계마다 <strong>목표 타수</strong>와 <strong>정확도</strong>가 있어요. 한 판에서 둘 다 넘기면 그 단계를 깨고 다음 단계가 열려요.
      </p>
      <Box>
        예: 브론즈 3단계 = 목표 60타 · 정확도 {STAGE_ACCURACY.bronze}% 이상 (한글). 핀 아래 숫자가 목표 타수예요.
      </Box>
      <p>
        처음에 한 <strong>배치 테스트</strong>({PLACEMENT.secondsPerTrack}초 × 4트랙) 결과로, 이미 잘하는 트랙은 높은 단계부터
        시작했어요. 아주 잘하면 골드 1단계부터 시작해요.
      </p>
      <p className="mt-2">빨리 치는 것보다 정확하게 치는 게 먼저예요. 정확도를 못 넘기면 타수가 높아도 통과가 안 돼요.</p>
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
            게임 한 판 · {GAME_COINS.play}코인, 최고 점수 갱신 · {GAME_COINS.best}코인
          </li>
          <li>
            친구 대결 · 참여 {GAME_COINS.play}코인, 1등 {GAME_COINS.raceWin}코인 더
          </li>
          <li>
            보스 처음 격파 · 나에게 {GAME_COINS.bossWin}코인 + 우리 반 지갑에 {GAME_COINS.bossClass}코인
          </li>
          <li>
            반 대결 1위 · 우리 반 지갑에 {CLASS_BATTLE.winnerBonus}코인
          </li>
        </ul>
      </Box>
      <p>개인 코인은 <strong>상점</strong>에서 미니미 꾸미기에, 반 코인은 <strong>우리 반 미니룸</strong> 꾸미기에 써요.</p>
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

export function ShopHelp() {
  const locked = MINIMI_ITEMS.filter((i) => i.lock);
  return (
    <>
      <p>
        내 코인으로 미니미(픽셀 토끼)의 <strong>털 색 · 모자 · 얼굴 · 목</strong>을 꾸밀 수 있어요. 꾸민 모습은 우리 반 미니룸과 대결 화면에
        그대로 나와요.
      </p>
      <Box>
        <ul className="list-disc pl-5">
          <li>아이템을 누르면 사기 전에 미리 입혀 볼 수 있어요.</li>
          <li>한 번 산 아이템은 언제든 다시 입고 벗을 수 있어요.</li>
          <li>티어를 올려야 열리는 특별한 아이템도 있어요.</li>
        </ul>
      </Box>
      <ul className="list-disc pl-5">
        {locked.map((i) => (
          <li key={i.id}>
            {i.name} · {lockLabel(i.lock!)}
          </li>
        ))}
      </ul>
    </>
  );
}

export function RoomHelp() {
  return (
    <>
      <p>우리 반 친구들의 미니미가 모두 모여 있는 방이에요. 오늘의 미션을 끝낸 친구는 반짝여요!</p>
      <Box>
        <ol className="list-decimal pl-5">
          <li>미니룸 꾸미기 투표에서 갖고 싶은 가구·벽지·바닥을 골라 추천해요.</li>
          <li>
            반 친구 {Math.round(ROOM.voteRatio * 100)}%(최소 {ROOM.minVotes}명)가 찬성하면 우리 반 지갑으로 자동으로 사요.
          </li>
          <li>찬성이 다 모였는데 반 코인이 모자라면, 코인이 모이는 순간 사요.</li>
        </ol>
      </Box>
      <p>추천은 한 사람당 {ROOM.maxOpenPerStudent}개까지 올릴 수 있어요. 찬성은 여러 개에 해도 돼요.</p>
    </>
  );
}

export function RaceHelp() {
  return (
    <>
      <p>우리 반 친구와 같은 글로 레이스해요. 한 번 붙으면 {RACE.maxRounds}판 중 {RACE.winsNeeded}판을 먼저 이긴 사람이 우승!</p>
      <Box>
        <ul className="list-disc pl-5">
          <li>
            <strong>클래식</strong>: 끝까지 먼저 친 사람이 그 판을 이겨요. 정확도 {RACE.minAccuracy}% 이상이어야 순위에 들어가요.
          </li>
          <li>
            <strong>성장 모드</strong>: 내 최근 5번 기록보다 가장 많이 잘 친 사람이 이겨요. 빠른 친구와도 공평하게 겨룰 수 있어요.
          </li>
          <li>
            <strong>자동 매치</strong>: 레이팅이 비슷한 친구와 1:1로 붙여 줘요. 클래식에서 이기면 레이팅이 오르고, 강한 친구를 이기면 더 많이
            올라요.
          </li>
        </ul>
      </Box>
      <p>
        판마다 참여 코인 {GAME_COINS.play}개, 시리즈 우승은 {GAME_COINS.raceWin}개 더! 채팅은 없고 이모티콘으로만 응원해요.
      </p>
    </>
  );
}

export function BattleHelp() {
  return (
    <>
      <p>같은 학년 반끼리 2주 동안 성장 점수를 겨뤄요. 월요일에 시작해서 2주 뒤 월요일에 결과가 나와요.</p>
      <Box>
        <p className="font-bold">반 점수 = 우리 반 친구들의 성장 점수 합 ÷ 반 인원</p>
        <p className="mt-1">인원으로 나누니까 반 인원이 많든 적든 공평해요.</p>
      </Box>
      <ul className="list-disc pl-5">
        <li>빠른 친구만 잘하는 게 아니라, 모두가 자기 기록보다 나아지면 반 점수가 올라요.</li>
        <li>매일 오늘의 미션을 하는 게 가장 확실한 방법이에요.</li>
        <li>1위 반은 반 지갑에 {CLASS_BATTLE.winnerBonus}코인 보너스를 받아요!</li>
      </ul>
    </>
  );
}

export const HELP_SECTIONS = [
  { id: "growth", title: "성장 점수", Body: GrowthHelp },
  { id: "tier", title: "티어와 단계", Body: TierHelp },
  { id: "level", title: "단계와 배치 테스트", Body: LevelHelp },
  { id: "coin", title: "코인", Body: CoinHelp },
  { id: "rain", title: "단어 비", Body: RainHelp },
  { id: "race", title: "친구 대결", Body: RaceHelp },
  { id: "shop", title: "상점", Body: ShopHelp },
  { id: "room", title: "반 미니룸", Body: RoomHelp },
  { id: "battle", title: "반 대결", Body: BattleHelp },
] as const;
