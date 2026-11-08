-- 2026-11-08 성장 점수 "연습량" 칸: 오늘 끝까지 친 판 수만큼 점수 (교사 결정)
-- Supabase 대시보드 → SQL Editor 에 이 파일 내용을 붙여 넣고 Run 하면 돼요. (여러 번 실행해도 괜찮아요)
-- 점수는 config/game.ts GROWTH.effort. 실행 전에도 합계(total)에는 들어가요

alter table public.growth_scores add column if not exists effort int not null default 0;
