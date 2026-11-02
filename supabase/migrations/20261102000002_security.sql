-- 2026-11-02 계정 지키기: 한 계정은 한 PC에서만 · 로그인 기록 · 대결 신청 받지 않기 · 비밀번호 잠금 풀기
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)

-- 지금 로그인한 PC 표시: 로그인할 때마다 새로 바뀌고, 다른 값을 가진 PC는 로그아웃돼요
alter table public.profiles add column if not exists session_key text;
-- 대결 신청 받지 않기
alter table public.profiles add column if not exists block_invites boolean not null default false;

-- 로그인 기록 (선생님 화면에서 어느 PC에서 들어왔는지 확인)
create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- 브라우저마다 정해지는 짧은 기기 표시 (같은 PC면 같은 값)
  device text not null,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists login_events_student on public.login_events (student_id, created_at desc);
alter table public.login_events enable row level security;

-- 대결 신청 기록 (너무 자주 보내지 못하게 서버가 세어요)
create table if not exists public.race_invites (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists race_invites_from on public.race_invites (from_id, created_at desc);
alter table public.race_invites enable row level security;

-- 기록 검토 이유에 "평소와 너무 다른 기록"(big-jump) 추가: flags 는 text[] 라서 따로 바꿀 것은 없어요
