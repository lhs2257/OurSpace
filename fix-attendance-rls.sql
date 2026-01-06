-- RLS 완전 비활성화 (개발/테스트 환경 전용)
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- 1. 기존 모든 정책 삭제
DROP POLICY IF EXISTS "Users can insert their own attendance" ON attendance;
DROP POLICY IF EXISTS "Attendance records are viewable by everyone" ON attendance;
DROP POLICY IF EXISTS "Anyone can insert attendance (DEV ONLY)" ON attendance;
DROP POLICY IF EXISTS "Anyone can update attendance (DEV ONLY)" ON attendance;
DROP POLICY IF EXISTS "Anyone can delete attendance (DEV ONLY)" ON attendance;

-- 2. RLS 완전 비활성화
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- 참고: 이 설정은 개발/테스트 전용입니다.
-- 프로덕션 배포 전에 RLS를 다시 활성화하고 적절한 정책을 설정해야 합니다.
-- 
-- RLS 다시 활성화하려면:
-- ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

