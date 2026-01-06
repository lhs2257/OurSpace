-- profiles 테이블의 조회 권한 문제 해결
-- "이름이 안 뜨는 문제" 해결을 위해 누구나 프로필을 조회할 수 있도록 설정합니다.

-- 1. profiles 테이블의 기존 정책 확인 (필요시 삭제)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 2. profiles 테이블 RLS 활성화 (안전장치)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. 누구나 프로필을 볼 수 있게 허용 (로그인한 사용자만 볼 수 있게 하려면 auth.uid() IS NOT NULL 조건 사용)
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING ( true );

-- 4. 본인 프로필만 수정/삭제 가능
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- 이 SQL을 실행하고 나면, 다른 사용자의 이름이 제대로 표시될 것입니다!
