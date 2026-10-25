-- 보스전과 친구 대결
--   · boss_records: 선생님이 직접 친 기록 (고스트). 학생은 이 기록과 레이스
--   · boss_defeats: 학생이 보스를 처음 이긴 기록 (보상은 처음 한 번)
--   · matches / match_players: 친구 대결 방과 참가자 결과 (등수는 서버가 받은 순서로)
-- 쓰기는 모두 서버(secret key)만. 학생 브라우저는 읽기만.

alter table public.attempts drop constraint if exists attempts_kind_check;
alter table public.attempts
  add constraint attempts_kind_check check (kind in ('practice', 'mission', 'weak', 'placement', 'game'));

create table public.boss_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_id uuid references public.profiles (id) on delete set null,
  title text not null,
  track text not null check (track in ('korean', 'english', 'symbol', 'code')),
  lines text[] not null,
  -- [[경과 ms, 친 글자 수], ...] 고스트가 움직이는 기록
  timeline jsonb not null,
  duration_ms int not null,
  cpm int not null,
  accuracy numeric(5, 1) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.boss_defeats (
  student_id uuid not null references public.profiles (id) on delete cascade,
  boss_id uuid not null references public.boss_records (id) on delete cascade,
  defeated_at timestamptz not null default now(),
  primary key (student_id, boss_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  track text not null check (track in ('korean', 'english', 'symbol', 'code')),
  lines text[] not null,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'done', 'void')),
  started_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  -- 서버가 결과를 받은 시각 기준 (started_at 부터 ms)
  finished_ms int,
  cpm int,
  accuracy numeric(5, 1),
  rank int,
  primary key (match_id, student_id)
);

alter table public.boss_records enable row level security;
alter table public.boss_defeats enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;

create policy "보스: 같은 학교" on public.boss_records for select
  using (school_id = public.my_school_id());

create policy "보스 격파: 나 또는 교사" on public.boss_defeats for select
  using (student_id = auth.uid() or public.is_teacher());

create policy "대결: 우리 반 또는 교사" on public.matches for select
  using (class_id in (select public.my_class_ids()) or public.teacher_can_see_class(class_id));

create policy "대결 참가자: 같은 대결을 볼 수 있으면" on public.match_players for select
  using (exists (select 1 from public.matches m where m.id = match_players.match_id));
