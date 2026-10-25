-- 혼자 하는 게임(단어 비 등) 기록도 attempts 에 저장
--   · kind 'game', mode 는 게임 이름(rain, runner …), level 은 게임마다 정한 음수 값
--   · score: 게임 점수 (개인 최고 점수 비교용)

alter table public.attempts drop constraint if exists attempts_kind_check;
alter table public.attempts
  add constraint attempts_kind_check check (kind in ('practice', 'mission', 'weak', 'placement', 'game'));

alter table public.attempts add column if not exists score int;
