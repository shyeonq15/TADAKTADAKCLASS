-- 2026-11-04 영단어 연구소: 틀린 단어장
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)
-- 빈칸 채우기·듣고 쓰기 묶음 통과와 이번 주 단어 보상은 원래 있던 level_clears 표를 써요 (track = vocab-blank / vocab-listen / vocab-week)

create table if not exists public.vocab_mistakes (
  student_id uuid not null references public.profiles (id) on delete cascade,
  word text not null,
  -- 지금까지 틀린 횟수
  misses int not null default 1,
  -- 틀린 뒤로 연속으로 맞힌 횟수 (config/vocab.ts review.rightToRemove 만큼 맞히면 단어장에서 빠져요)
  streak int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, word)
);

alter table public.vocab_mistakes enable row level security;

drop policy if exists "틀린 단어: 나 또는 교사" on public.vocab_mistakes;
create policy "틀린 단어: 나 또는 교사" on public.vocab_mistakes for select
  using (
    student_id = auth.uid()
    or exists (select 1 from enrollments e where e.student_id = vocab_mistakes.student_id and public.teacher_can_see_class(e.class_id))
  );
