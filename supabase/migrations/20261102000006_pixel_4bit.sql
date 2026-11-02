-- 2026-11-02 픽셀 아트 4비트(16색) 허용 (선생님 활동지 색표 0000~1111)
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)

alter table public.pixel_arts drop constraint if exists pixel_arts_bits_check;
alter table public.pixel_arts add constraint pixel_arts_bits_check check (bits in (1, 2, 4));
