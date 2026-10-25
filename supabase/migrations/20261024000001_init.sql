-- 타닥타닥 우리반: 기본 테이블과 권한 규칙 (RLS)
-- 구조: 학교 › 학년도 › 반 › 학생 (CLAUDE.md 5장)
--
-- 권한 원칙
--   · 학생은 자기 기록, 자기 반 정보만 읽는다.
--   · 기록·점수·코인 쓰기는 서버(secret key)만 한다. 학생 브라우저에는 쓰기 권한이 없다.
--   · 학생끼리는 닉네임만 보인다. 실명은 교사만 본다 (class_members 함수 참고).

-- ───────────── 학교 구조 ─────────────

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- 로그인 허용 이메일 도메인 (예: senedu.kr)
  email_domain text not null,
  created_at timestamptz not null default now()
);

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  year int not null,
  unique (school_id, year)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years (id) on delete cascade,
  grade int not null check (grade between 1 and 6),
  class_no int not null check (class_no between 1 and 30),
  -- 학생이 반에 들어올 때 입력하는 코드
  join_code text not null unique,
  -- 반 지갑
  coins int not null default 0,
  created_at timestamptz not null default now(),
  unique (school_year_id, grade, class_no)
);

-- ───────────── 사람 ─────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'teacher')),
  school_id uuid references public.schools (id),
  -- 실명: 교사 화면에서만 보임
  real_name text,
  -- 학생끼리 보이는 이름
  nickname text check (char_length(nickname) between 2 and 12),
  email text,
  -- 'google' 또는 'pin'
  login_method text not null default 'google' check (login_method in ('google', 'pin')),
  created_at timestamptz not null default now()
);

-- 학생이 어느 학년도에 어느 반 몇 번이었는지 (진급해도 기록은 학생에게 붙어 있음)
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  number int not null check (number between 1 and 50),
  created_at timestamptz not null default now(),
  unique (class_id, number),
  unique (student_id, class_id)
);

-- PIN 로그인 실패 기록 (연속 실패 시 잠시 잠금)
create table public.pin_failures (
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  failed_at timestamptz not null default now()
);
create index on public.pin_failures (enrollment_id, failed_at);

-- ───────────── 연습 기록 ─────────────

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  kind text not null check (kind in ('practice', 'mission', 'weak', 'placement')),
  track text not null check (track in ('korean', 'english', 'symbol', 'code')),
  level int not null default 0,
  mode text not null,
  cpm int not null check (cpm >= 0),
  accuracy numeric(5, 1) not null check (accuracy between 0 and 100),
  keystrokes int not null default 0,
  duration_ms int not null default 0,
  -- 놓친 키 → 횟수 (약한 키 분석)
  missed_keys jsonb not null default '{}'::jsonb,
  -- too-fast, too-regular 등
  flags text[] not null default '{}',
  suspicious boolean not null default false,
  -- 의심 기록 교사 확인: none(의심 아님) · pending · approved · rejected
  review_status text not null default 'none' check (review_status in ('none', 'pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index on public.attempts (student_id, created_at desc);
create index on public.attempts (class_id, created_at desc);
create index on public.attempts (student_id, track, level, created_at desc);

-- 트랙별 진행: 열린 레벨, 배치 테스트 결과
create table public.track_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  track text not null check (track in ('korean', 'english', 'symbol', 'code')),
  unlocked_level int not null default 1,
  placement_cpm int,
  primary key (student_id, track)
);

create table public.level_clears (
  student_id uuid not null references public.profiles (id) on delete cascade,
  track text not null,
  level int not null,
  cleared_at timestamptz not null default now(),
  primary key (student_id, track, level)
);

create table public.mission_completions (
  student_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  class_id uuid references public.classes (id) on delete set null,
  completed_at timestamptz not null default now(),
  primary key (student_id, day)
);

-- 하루 성장 점수 (반 대결 집계용)
create table public.growth_scores (
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  day date not null,
  participation int not null default 0,
  speed int not null default 0,
  accuracy int not null default 0,
  streak int not null default 0,
  first_clear int not null default 0,
  total int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, day)
);
create index on public.growth_scores (class_id, day);

-- ───────────── 화폐 ─────────────

create table public.wallets (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  coins int not null default 0 check (coins >= 0)
);

-- 개인(student_id) 또는 반(class_id) 지갑 내역
create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now(),
  check (student_id is not null or class_id is not null)
);
create index on public.coin_transactions (student_id, created_at desc);

-- ───────────── 교사 연습문 ─────────────

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  owner_id uuid references public.profiles (id) on delete set null,
  title text not null,
  track text not null check (track in ('korean', 'english', 'symbol', 'code')),
  -- 공개 범위 기본값: 우리 학교만
  visibility text not null default 'school' check (visibility in ('private', 'school')),
  created_at timestamptz not null default now()
);

create table public.passages (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.packs (id) on delete cascade,
  mode text not null check (mode in ('keys', 'words', 'sentences', 'code')),
  body text not null,
  sort int not null default 0
);

-- 연습팩을 어느 반에 배포했는지 (오늘의 미션 지정 포함)
create table public.pack_assignments (
  pack_id uuid not null references public.packs (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  -- 이 날짜의 오늘의 미션으로 지정 (없으면 자유 연습용)
  mission_day date,
  created_at timestamptz not null default now(),
  primary key (pack_id, class_id)
);

-- ───────────── 권한 도우미 함수 ─────────────
-- security definer: RLS 안에서 다른 테이블을 안전하게 조회하려고 사용

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

create or replace function public.my_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid();
$$;

create or replace function public.my_class_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select class_id from enrollments where student_id = auth.uid();
$$;

-- 교사가 이 반을 볼 수 있는지 (같은 학교)
create or replace function public.teacher_can_see_class(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_teacher() and exists (
    select 1 from classes c join school_years y on y.id = c.school_year_id
    where c.id = target and y.school_id = public.my_school_id()
  );
$$;

-- 우리 반 친구 목록: 닉네임만 (실명·이메일은 주지 않음)
create or replace function public.class_members(target uuid)
returns table (student_id uuid, nickname text, number int)
language sql stable security definer set search_path = public as $$
  select p.id, p.nickname, case when public.is_teacher() then e.number else null end
  from enrollments e join profiles p on p.id = e.student_id
  where e.class_id = target
    and (target in (select public.my_class_ids()) or public.teacher_can_see_class(target));
$$;

-- ───────────── RLS 켜기 ─────────────

alter table public.schools enable row level security;
alter table public.school_years enable row level security;
alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.pin_failures enable row level security;
alter table public.attempts enable row level security;
alter table public.track_progress enable row level security;
alter table public.level_clears enable row level security;
alter table public.mission_completions enable row level security;
alter table public.growth_scores enable row level security;
alter table public.wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.packs enable row level security;
alter table public.passages enable row level security;
alter table public.pack_assignments enable row level security;

-- 읽기 규칙만 둡니다. 쓰기 규칙이 없으면 브라우저에서는 쓸 수 없고, 서버(secret key)만 씁니다.

create policy "학교: 내 학교" on public.schools for select
  using (id = public.my_school_id());

create policy "학년도: 내 학교" on public.school_years for select
  using (school_id = public.my_school_id());

create policy "반: 내 반 또는 교사" on public.classes for select
  using (id in (select public.my_class_ids()) or public.teacher_can_see_class(id));

create policy "프로필: 나 또는 같은 학교 교사" on public.profiles for select
  using (id = auth.uid() or (public.is_teacher() and school_id = public.my_school_id()));

create policy "반 배정: 나 또는 교사" on public.enrollments for select
  using (student_id = auth.uid() or public.teacher_can_see_class(class_id));

create policy "기록: 나 또는 교사" on public.attempts for select
  using (student_id = auth.uid() or (class_id is not null and public.teacher_can_see_class(class_id)));

create policy "진행: 나 또는 교사" on public.track_progress for select
  using (
    student_id = auth.uid()
    or exists (select 1 from enrollments e where e.student_id = track_progress.student_id and public.teacher_can_see_class(e.class_id))
  );

create policy "클리어: 나 또는 교사" on public.level_clears for select
  using (
    student_id = auth.uid()
    or exists (select 1 from enrollments e where e.student_id = level_clears.student_id and public.teacher_can_see_class(e.class_id))
  );

create policy "미션 완료: 나 또는 교사" on public.mission_completions for select
  using (student_id = auth.uid() or (class_id is not null and public.teacher_can_see_class(class_id)));

-- 성장 점수는 반 점수 계산에 쓰이므로 우리 반 것은 읽을 수 있음 (화면에는 반 평균만 표시)
create policy "성장 점수: 우리 반 또는 교사" on public.growth_scores for select
  using (
    student_id = auth.uid()
    or class_id in (select public.my_class_ids())
    or (class_id is not null and public.teacher_can_see_class(class_id))
  );

create policy "지갑: 나" on public.wallets for select
  using (
    student_id = auth.uid()
    or (public.is_teacher() and exists (
      select 1 from profiles p where p.id = wallets.student_id and p.school_id = public.my_school_id()
    ))
  );

create policy "코인 내역: 나 또는 우리 반 지갑" on public.coin_transactions for select
  using (
    student_id = auth.uid()
    or class_id in (select public.my_class_ids())
    or (class_id is not null and public.teacher_can_see_class(class_id))
  );

create policy "연습팩: 같은 학교" on public.packs for select
  using (school_id = public.my_school_id() and (visibility = 'school' or owner_id = auth.uid()));

create policy "지문: 볼 수 있는 연습팩" on public.passages for select
  using (exists (select 1 from packs p where p.id = passages.pack_id));

create policy "배포: 우리 반 또는 교사" on public.pack_assignments for select
  using (class_id in (select public.my_class_ids()) or public.teacher_can_see_class(class_id));
