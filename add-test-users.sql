-- 테스트용 사용자 프로필 추가
-- 참고: auth.users에 실제 사용자가 없으면 외래 키 오류가 발생할 수 있습니다
-- 그런 경우 프로필 없이도 작동하도록 코드를 수정했습니다

-- 프로필 삽입 시도 (외래 키 오류 무시)
INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000000', '김철수', '', NOW()),
  ('11111111-1111-1111-1111-111111111111', '이영희', '', NOW())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = EXCLUDED.updated_at;

-- 참고: 만약 위 명령이 외래 키 오류로 실패하면
-- 프로필 없이도 작동하도록 코드가 수정되어 있습니다.
-- 단순히 이 SQL을 실행하지 않아도 팀원 상태 카드가 작동합니다.

