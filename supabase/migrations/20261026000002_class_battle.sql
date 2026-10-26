-- 반 대결 결과 (2주마다). 기간이 끝난 뒤 처음 순위판을 연 사람이 집계하고, 1위 반에 보너스를 줘요.
-- (period_start, class_id) 가 겹치지 않아서 보너스가 두 번 들어가지 않아요.

create table public.class_battle_results (
  period_start date not null,
  class_id uuid not null references public.classes (id) on delete cascade,
  rank int not null,
  -- 반 점수 = 반 학생 성장 점수 합 ÷ 반 인원 (소수 첫째 자리까지)
  score numeric(8, 1) not null,
  members int not null,
  bonus int not null default 0,
  created_at timestamptz not null default now(),
  primary key (period_start, class_id)
);

alter table public.class_battle_results enable row level security;

create policy "반 대결 결과: 같은 학교" on public.class_battle_results for select
  using (exists (
    select 1 from public.classes c join public.school_years y on y.id = c.school_year_id
    where c.id = class_battle_results.class_id and y.school_id = public.my_school_id()
  ));
