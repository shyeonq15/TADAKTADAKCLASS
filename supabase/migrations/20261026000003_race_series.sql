-- 친구 대결 확장: 3판 2선승(시리즈) · 성장 모드 · 레이팅(Elo) · 자동 매치

-- 한 판 = matches 한 줄. 같은 시리즈의 판들은 series_id 가 같아요 (첫 판의 id)
alter table public.matches add column if not exists series_id uuid;
alter table public.matches add column if not exists round int not null default 1;
alter table public.matches add column if not exists mode text not null default 'classic';
alter table public.matches add column if not exists difficulty text not null default 'normal';
-- 시리즈가 이 판으로 끝났는지
alter table public.matches add column if not exists series_done boolean not null default false;
alter table public.matches drop constraint if exists matches_mode_check;
alter table public.matches add constraint matches_mode_check check (mode in ('classic', 'growth'));
update public.matches set series_id = id where series_id is null;
create unique index if not exists matches_series_round on public.matches (series_id, round);

-- 성장 모드: 내 평균 대비 몇 % / 시리즈가 끝났을 때 레이팅 변화
alter table public.match_players add column if not exists growth_pct numeric(6, 1);
alter table public.match_players add column if not exists rating_delta int;

-- 대결 레이팅 (클래식 시리즈 결과만 반영)
create table if not exists public.race_ratings (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  rating int not null default 1000,
  games int not null default 0,
  updated_at timestamptz not null default now()
);

-- 자동 매치 대기열
create table if not exists public.match_queue (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  track text not null,
  rating int not null,
  joined_at timestamptz not null default now(),
  -- 화면이 2초마다 "아직 기다려요"를 알려요. 오래 소식이 없으면 짝짓지 않아요
  seen_at timestamptz not null default now(),
  -- 짝이 정해지면 그 대결 id
  match_id uuid
);

-- 두 사람을 한꺼번에 짝지어요 (둘 다 아직 짝이 없을 때만). 성공하면 true
create or replace function public.pair_queue(p_a uuid, p_b uuid, p_match uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  -- 항상 같은 순서로 잠가서 서로 기다리다 멈추는 일이 없게
  perform 1 from match_queue where student_id in (p_a, p_b) order by student_id for update;
  select count(*) into n from match_queue where student_id in (p_a, p_b) and match_id is null;
  if n < 2 then
    return false;
  end if;
  update match_queue set match_id = p_match where student_id in (p_a, p_b);
  return true;
end;
$$;

revoke execute on function public.pair_queue(uuid, uuid, uuid) from public, anon, authenticated;

alter table public.race_ratings enable row level security;
alter table public.match_queue enable row level security;

create policy "레이팅: 나 또는 교사" on public.race_ratings for select
  using (student_id = auth.uid() or public.is_teacher());

create policy "대기열: 나" on public.match_queue for select
  using (student_id = auth.uid());
