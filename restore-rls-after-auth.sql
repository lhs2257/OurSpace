-- Supabase 인증 설정을 위한 최종 준비

-- 1. 이메일 자동 확인 (개발 환경)
-- Supabase 대시보드 → Authentication → Settings → Email Auth
-- "Enable email confirmations" 을 OFF로 설정 (개발 중에는)

-- 2. 외래 키 및 RLS 정책 복원 준비
-- 현재는 개발 환경이므로 실제 인증이 작동하는 것을 확인한 후 복원

-- 참고: 다음 명령어는 인증 시스템이 완전히 작동한 후에 실행하세요

/*
-- profiles 테이블 외래 키 복원
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- attendance 테이블 외래 키 복원
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- attendance RLS 재활성화
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- attendance 정책 생성
CREATE POLICY "Authenticated users can view all attendance"
  ON attendance FOR SELECT
  USING ( auth.uid() IS NOT NULL );

CREATE POLICY "Users can insert their own attendance"
  ON attendance FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own attendance"
  ON attendance FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete their own attendance"
  ON attendance FOR DELETE
  USING ( auth.uid() = user_id );
*/

-- 먼저 인증 시스템을 테스트하고, 문제가 없으면 위의 주석을 해제하여 실행하세요.
