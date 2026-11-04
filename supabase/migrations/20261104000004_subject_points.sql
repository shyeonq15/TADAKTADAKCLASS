-- 2026-11-04 과목 점수 (교과 탐험 과목 랭킹 하나로 통합, 교사 결정)
-- 과목 점수 = 별 × 10 + 기록 갱신 × 5 + 연습한 날 × 5  (숫자는 config/subjects.ts SUBJECT_POINTS)
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)

-- 지문마다 내 최고 타수를 넘은 횟수 (반복 연습 보상)
alter table public.subject_progress add column if not exists improves int not null default 0;

-- 사례 분류 퀴즈 (선거 원칙 지킴이 …) 가장 좋은 기록 → 퀴즈 별
create table if not exists public.case_quiz_scores (
  student_id uuid not null references public.profiles (id) on delete cascade,
  set_id text not null,
  best_score int not null default 0,
  total int not null default 0,
  plays int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (student_id, set_id)
);

alter table public.case_quiz_scores enable row level security;

drop policy if exists "사례 퀴즈 점수: 나 또는 교사" on public.case_quiz_scores;
create policy "사례 퀴즈 점수: 나 또는 교사" on public.case_quiz_scores for select
  using (
    student_id = auth.uid()
    or exists (select 1 from enrollments e where e.student_id = case_quiz_scores.student_id and public.teacher_can_see_class(e.class_id))
  );
