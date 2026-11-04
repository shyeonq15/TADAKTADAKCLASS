-- 2026-11-04 교과 탐험 개념 퀴즈 점수 (단원별 퀴즈 랭킹용)
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)
-- 점수 = 빈칸마다 처음 친 답이 맞은 개수 (서버가 다시 채점). 단원마다 가장 좋은 기록 하나만 남겨요.

create table if not exists public.concept_quiz_scores (
  student_id uuid not null references public.profiles (id) on delete cascade,
  pack_id uuid not null references public.packs (id) on delete cascade,
  best_score int not null default 0,
  total int not null default 0,
  -- 가장 좋은 점수를 냈을 때 걸린 시간 (점수가 같으면 빨리 끝낸 친구가 위)
  best_ms int not null default 0,
  plays int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (student_id, pack_id)
);

alter table public.concept_quiz_scores enable row level security;

drop policy if exists "개념 퀴즈 점수: 나 또는 교사" on public.concept_quiz_scores;
create policy "개념 퀴즈 점수: 나 또는 교사" on public.concept_quiz_scores for select
  using (
    student_id = auth.uid()
    or exists (select 1 from enrollments e where e.student_id = concept_quiz_scores.student_id and public.teacher_can_see_class(e.class_id))
  );
