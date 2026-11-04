-- 2026-11-04 학습 활동 성장 점수: 영단어·개념 퀴즈·이진수·픽셀 아트 같은 활동을 끝내면 성장 점수 "학습 활동" (교사 결정)
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)
-- 같은 날 같은 활동(kind + ref)은 한 번만 세요. 점수는 config/game.ts GROWTH.activity

create table if not exists public.activity_log (
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- 한국 시간 날짜
  day date not null,
  -- 활동 종류 (vocab-blank, concept-quiz, binary …)와 무엇을 했는지 (묶음 번호, 단원 id …)
  kind text not null,
  ref text not null default '',
  created_at timestamptz not null default now(),
  primary key (student_id, day, kind, ref)
);

alter table public.activity_log enable row level security;

drop policy if exists "활동 기록: 나 또는 교사" on public.activity_log;
create policy "활동 기록: 나 또는 교사" on public.activity_log for select
  using (
    student_id = auth.uid()
    or exists (select 1 from enrollments e where e.student_id = activity_log.student_id and public.teacher_can_see_class(e.class_id))
  );

-- 날마다 성장 점수에 "학습 활동" 칸
alter table public.growth_scores add column if not exists activity int not null default 0;
