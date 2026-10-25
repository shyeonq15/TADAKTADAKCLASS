-- 상점(개인 미니미 아이템) + 반 미니룸(반 지갑, 투표로 사기)
--   · 아이템 목록·가격은 코드(src/config/shop.ts)에 있고, 여기에는 누가 무엇을 가졌는지만 저장
--   · 코인 빼기와 아이템 넣기는 함수 하나로 한꺼번에 (중간에 끊겨도 코인만 사라지는 일이 없게)

-- ───────────── 개인 미니미 ─────────────

create table public.student_items (
  student_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null,
  bought_at timestamptz not null default now(),
  primary key (student_id, item_id)
);

-- 지금 입고 있는 것 { fur, hat, face, neck }
create table public.minimi_looks (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  look jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ───────────── 반 미니룸 ─────────────

-- 반 미니룸에 놓인 아이템
create table public.room_items (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  item_id text not null,
  x int not null default 0,
  y int not null default 0,
  placed_at timestamptz not null default now()
);
create index on public.room_items (class_id);

-- "이거 사자!" 추천. 표가 모이면 반 지갑으로 산다
create table public.room_proposals (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  item_id text not null,
  proposer_id uuid references public.profiles (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'bought', 'closed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index on public.room_proposals (class_id, status);

create table public.room_votes (
  proposal_id uuid not null references public.room_proposals (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (proposal_id, student_id)
);

-- ───────────── 코인 함수 (서버만 부름) ─────────────

-- 개인 지갑에 코인 더하기 (동시에 여러 번 와도 안 꼬이게 한 줄로)
create or replace function public.add_wallet_coins(p_student uuid, p_amount int)
returns int language sql security definer set search_path = public as $$
  insert into wallets (student_id, coins) values (p_student, greatest(p_amount, 0))
  on conflict (student_id) do update set coins = wallets.coins + greatest(p_amount, 0)
  returning coins;
$$;

-- 개인 아이템 사기: 'ok' | 'owned' | 'poor'
create or replace function public.buy_student_item(p_student uuid, p_item text, p_price int, p_reason text)
returns text language plpgsql security definer set search_path = public as $$
declare
  c int;
begin
  if exists (select 1 from student_items where student_id = p_student and item_id = p_item) then
    return 'owned';
  end if;
  select coins into c from wallets where student_id = p_student for update;
  if coalesce(c, 0) < p_price then
    return 'poor';
  end if;
  update wallets set coins = coins - p_price where student_id = p_student;
  insert into student_items (student_id, item_id) values (p_student, p_item);
  if p_price > 0 then
    insert into coin_transactions (student_id, amount, reason) values (p_student, -p_price, p_reason);
  end if;
  return 'ok';
end;
$$;

-- 반 미니룸 아이템 사기 (추천이 통과했을 때): 'ok' | 'poor' | 'closed'
create or replace function public.buy_room_item(p_proposal uuid, p_price int, p_reason text, p_x int, p_y int)
returns text language plpgsql security definer set search_path = public as $$
declare
  pr room_proposals%rowtype;
  c int;
begin
  select * into pr from room_proposals where id = p_proposal for update;
  if not found or pr.status <> 'open' then
    return 'closed';
  end if;
  select coins into c from classes where id = pr.class_id for update;
  if coalesce(c, 0) < p_price then
    return 'poor';
  end if;
  update classes set coins = coins - p_price where id = pr.class_id;
  update room_proposals set status = 'bought', decided_at = now() where id = p_proposal;
  insert into room_items (class_id, item_id, x, y) values (pr.class_id, pr.item_id, p_x, p_y);
  insert into coin_transactions (class_id, amount, reason) values (pr.class_id, -p_price, p_reason);
  return 'ok';
end;
$$;

revoke execute on function public.add_wallet_coins(uuid, int) from public, anon, authenticated;
revoke execute on function public.buy_student_item(uuid, text, int, text) from public, anon, authenticated;
revoke execute on function public.buy_room_item(uuid, int, text, int, int) from public, anon, authenticated;

-- ───────────── 읽기 권한 (쓰기는 서버만) ─────────────

alter table public.student_items enable row level security;
alter table public.minimi_looks enable row level security;
alter table public.room_items enable row level security;
alter table public.room_proposals enable row level security;
alter table public.room_votes enable row level security;

create policy "내 아이템: 나 또는 교사" on public.student_items for select
  using (student_id = auth.uid() or public.is_teacher());

-- 미니미는 반 친구도 봐요 (미니룸·대결 화면)
create policy "미니미: 같은 학교" on public.minimi_looks for select
  using (exists (select 1 from public.profiles p where p.id = minimi_looks.student_id and p.school_id = public.my_school_id()));

create policy "미니룸: 우리 반 또는 교사" on public.room_items for select
  using (class_id in (select public.my_class_ids()) or public.teacher_can_see_class(class_id));

create policy "미니룸 추천: 우리 반 또는 교사" on public.room_proposals for select
  using (class_id in (select public.my_class_ids()) or public.teacher_can_see_class(class_id));

create policy "미니룸 투표: 볼 수 있는 추천" on public.room_votes for select
  using (exists (select 1 from public.room_proposals r where r.id = room_votes.proposal_id));
