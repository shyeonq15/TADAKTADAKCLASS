-- 2026-11-02 교과 탐험: 선생님이 교과서 발췌문을 과목·단원별로 붙여 넣으면, 학생이 단원 지도에서 지문을 하나씩 깨며 별을 모아요.
-- 연습팩(packs)에 과목·단원·학년을 붙여서 써요. 과목이 있는 연습팩 = 교과 탐험 단원 (반 배포 없이 같은 학교 학생에게 보여요)
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)

alter table public.packs add column if not exists subject text;
alter table public.packs add column if not exists unit_no int;
-- 몇 학년용 (비우면 모든 학년)
alter table public.packs add column if not exists grade int;
create index if not exists packs_subject on public.packs (school_id, subject) where subject is not null;

-- 지문마다 가장 좋은 별 (0~3)
create table if not exists public.subject_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  passage_id uuid not null references public.passages (id) on delete cascade,
  stars int not null default 0 check (stars between 0 and 3),
  best_cpm int not null default 0,
  best_accuracy numeric(5, 1) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, passage_id)
);
alter table public.subject_progress enable row level security;
