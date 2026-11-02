-- 2026-11-02 민재 아이디어: 개인 프로필(자기소개) · 닉네임 변경권 · 건의함
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)

-- ───────────── 프로필: 한 줄 자기소개 ─────────────
alter table public.profiles add column if not exists bio text;
alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 60);

-- ───────────── 닉네임 변경 기록 (이전 닉네임은 프로필에서 볼 수 있어요) ─────────────
create table if not exists public.nickname_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  old_nickname text not null,
  new_nickname text not null,
  cost int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists nickname_history_student on public.nickname_history (student_id, created_at desc);
alter table public.nickname_history enable row level security;
-- 읽기·쓰기 규칙이 없으면 브라우저에서는 못 읽고, 서버(secret key)만 읽고 써요.

-- 닉네임 바꾸기: 처음 한 번은 무료, 그다음부터 p_price 코인. 'ok' | 'poor' | 'same'
create or replace function public.change_nickname(p_student uuid, p_new text, p_price int)
returns text language plpgsql security definer set search_path = public as $$
declare
  old text;
  used int;
  price int;
  c int;
begin
  select nickname into old from profiles where id = p_student for update;
  if old = p_new then
    return 'same';
  end if;
  select count(*) into used from nickname_history where student_id = p_student;
  price := case when used = 0 then 0 else greatest(p_price, 0) end;
  if price > 0 then
    select coins into c from wallets where student_id = p_student for update;
    if coalesce(c, 0) < price then
      return 'poor';
    end if;
    update wallets set coins = coins - price where student_id = p_student;
    insert into coin_transactions (student_id, amount, reason) values (p_student, -price, '닉네임 변경권');
  end if;
  update profiles set nickname = p_new where id = p_student;
  insert into nickname_history (student_id, old_nickname, new_nickname, cost) values (p_student, coalesce(old, ''), p_new, price);
  return 'ok';
end;
$$;
revoke execute on function public.change_nickname(uuid, text, int) from public, anon, authenticated;

-- ───────────── 건의함 (버그 제보·아이디어) ─────────────
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools (id) on delete cascade,
  student_id uuid references public.profiles (id) on delete set null,
  class_id uuid references public.classes (id) on delete set null,
  kind text not null check (kind in ('bug', 'idea')),
  body text not null check (char_length(body) between 2 and 1000),
  -- 어느 화면에서 보냈는지 (버그 찾을 때 도움)
  page text,
  status text not null default 'new' check (status in ('new', 'seen', 'done')),
  -- 선생님 답장 (학생이 내 건의 목록에서 볼 수 있어요)
  reply text check (reply is null or char_length(reply) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists feedback_school on public.feedback (school_id, created_at desc);
create index if not exists feedback_student on public.feedback (student_id, created_at desc);
alter table public.feedback enable row level security;
