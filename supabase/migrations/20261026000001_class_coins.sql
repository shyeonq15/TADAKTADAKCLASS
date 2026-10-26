-- 반 지갑에 코인 더하기를 한 줄로 (반 친구 30명이 동시에 미션을 끝내도 코인이 사라지지 않게)

create or replace function public.add_class_coins(p_class uuid, p_amount int)
returns int language sql security definer set search_path = public as $$
  update classes set coins = coins + greatest(p_amount, 0) where id = p_class returning coins;
$$;

revoke execute on function public.add_class_coins(uuid, int) from public, anon, authenticated;
