-- 학번 + 그림 비밀번호 로그인
--   · 학생이 처음 들어올 때 그림 4개로 비밀번호를 직접 정함
--   · 교사가 반마다 "처음 비밀번호 정하기 허용"을 켠 동안에만 정할 수 있음

alter table public.profiles
  add column if not exists secret_set boolean not null default false;

alter table public.classes
  add column if not exists allow_secret_setup boolean not null default false;

-- 이미 숫자 PIN으로 만든 학생도 그림 비밀번호를 새로 정함 (secret_set 기본값 false)
