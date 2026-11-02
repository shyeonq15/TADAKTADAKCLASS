-- 2026-11-02 학생 보스: 레전드 이상 학생이 자기 기록을 보스로 등록하고 상금을 걸어요.
--   · 상금은 만든 학생의 코인에서 빠지고, 처음 이긴 선착순 10명이 1/10씩 받아요 (코인이 새로 생기지 않아요)
--   · 보스를 내리면 남은 상금은 돌려받아요
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)

alter table public.boss_records add column if not exists student_id uuid references public.profiles (id) on delete cascade;
alter table public.boss_records add column if not exists school_year_id uuid references public.school_years (id) on delete cascade;
alter table public.boss_records add column if not exists grade int;
-- 건 상금 전체, 지금까지 상금을 받은 사람 수
alter table public.boss_records add column if not exists prize int not null default 0;
alter table public.boss_records add column if not exists prize_paid int not null default 0;
create index if not exists boss_records_student on public.boss_records (student_id) where student_id is not null;

-- 코인 쓰기 (모자라면 'poor')
create or replace function public.spend_wallet_coins(p_student uuid, p_amount int, p_reason text)
returns text language plpgsql security definer set search_path = public as $$
declare
  c int;
begin
  if p_amount <= 0 then
    return 'ok';
  end if;
  select coins into c from wallets where student_id = p_student for update;
  if coalesce(c, 0) < p_amount then
    return 'poor';
  end if;
  update wallets set coins = coins - p_amount where student_id = p_student;
  insert into coin_transactions (student_id, amount, reason) values (p_student, -p_amount, p_reason);
  return 'ok';
end;
$$;
revoke execute on function public.spend_wallet_coins(uuid, int, text) from public, anon, authenticated;

-- 학생 보스 상금 받기: 남은 자리가 있으면 1/p_slots 를 주고 받은 코인 수를 돌려줘요 (없으면 0)
create or replace function public.claim_boss_prize(p_boss uuid, p_student uuid, p_slots int, p_reason text)
returns int language plpgsql security definer set search_path = public as $$
declare
  b boss_records%rowtype;
  amount int;
begin
  select * into b from boss_records where id = p_boss for update;
  if not found or b.student_id is null or b.prize_paid >= p_slots or b.prize <= 0 then
    return 0;
  end if;
  amount := b.prize / p_slots;
  update boss_records set prize_paid = prize_paid + 1 where id = p_boss;
  insert into wallets (student_id, coins) values (p_student, amount)
  on conflict (student_id) do update set coins = wallets.coins + amount;
  insert into coin_transactions (student_id, amount, reason) values (p_student, amount, p_reason);
  return amount;
end;
$$;
revoke execute on function public.claim_boss_prize(uuid, uuid, int, text) from public, anon, authenticated;

-- 학생 보스 내리기: 남은 상금을 만든 학생에게 돌려주고 보스를 숨겨요. 돌려준 코인 수를 돌려줘요
create or replace function public.retire_student_boss(p_boss uuid, p_slots int)
returns int language plpgsql security definer set search_path = public as $$
declare
  b boss_records%rowtype;
  amount int;
begin
  select * into b from boss_records where id = p_boss for update;
  if not found or b.student_id is null then
    return 0;
  end if;
  amount := greatest(0, (b.prize / p_slots) * (p_slots - b.prize_paid));
  update boss_records set active = false, prize_paid = p_slots where id = p_boss;
  if amount > 0 then
    insert into wallets (student_id, coins) values (b.student_id, amount)
    on conflict (student_id) do update set coins = wallets.coins + amount;
    insert into coin_transactions (student_id, amount, reason) values (b.student_id, amount, '학생 보스 남은 상금 돌려받기');
  end if;
  return amount;
end;
$$;
revoke execute on function public.retire_student_boss(uuid, int) from public, anon, authenticated;
