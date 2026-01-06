-- attendance 테이블의 외래 키 제약 조건 제거 (개발/테스트용)
-- 이렇게 하면 profiles에 없는 사용자도 출퇴근 기록을 만들 수 있습니다

-- 1. 기존 외래 키 제약 조건 제거
ALTER TABLE public.attendance 
DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;

-- 2. profiles 테이블에 임의로 두 사용자 추가 (auth.users 무시)
-- 먼저 외래 키 제약 조건을 profiles에서도 제거
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. 이제 profiles에 두 사용자 추가 가능
INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000000', '김철수', '', NOW()),
  ('11111111-1111-1111-1111-111111111111', '이영희', '', NOW())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = EXCLUDED.updated_at;

-- 참고: 이 설정은 개발/테스트 전용입니다.
-- 프로덕션 배포 전에 외래 키 제약 조건을 다시 추가해야 합니다.
