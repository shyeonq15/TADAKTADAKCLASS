-- 2026-11-02 픽셀 아트 · 협동 레이드 · 주간 챌린지
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)

-- 0과 1로 그린 픽셀 아트 (우리 반 갤러리에 걸려요)
create table if not exists public.pixel_arts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 20),
  -- 1비트(0·1) 또는 2비트(0~3 네 가지 색)
  bits int not null default 1 check (bits in (1, 2)),
  -- 16줄, 줄마다 16칸 숫자
  rows text[] not null,
  created_at timestamptz not null default now()
);
create index if not exists pixel_arts_class on public.pixel_arts (class_id, created_at desc);
alter table public.pixel_arts enable row level security;

-- 협동 레이드: 반마다 주마다 보스를 쓰러뜨렸는지 (보상은 한 번만)
create table if not exists public.raid_results (
  class_id uuid not null references public.classes (id) on delete cascade,
  week_start date not null,
  defeated_at timestamptz not null default now(),
  primary key (class_id, week_start)
);
alter table public.raid_results enable row level security;

-- 주간 챌린지 보상 받은 기록 (한 주에 챌린지마다 한 번)
create table if not exists public.weekly_claims (
  student_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  challenge_id text not null,
  claimed_at timestamptz not null default now(),
  primary key (student_id, week_start, challenge_id)
);
alter table public.weekly_claims enable row level security;
