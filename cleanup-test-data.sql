-- 테스트 데이터 완전 삭제 (연관 데이터 포함)

-- 1. 삭제할 테스트 사용자 ID 목록 정의 (임시 테이블 사용)
CREATE TEMP TABLE test_users AS
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- 2. 자식 테이블 데이터 먼저 삭제 (순서 중요!)
-- schedules 테이블
DELETE FROM public.schedules
WHERE user_id IN (SELECT id FROM test_users);

-- attendance 테이블
DELETE FROM public.attendance
WHERE user_id IN (SELECT id FROM test_users);

-- messages 테이블
DELETE FROM public.messages
WHERE sender_id IN (SELECT id FROM test_users);

-- 3. 이제 profiles 테이블에서 사용자 삭제
DELETE FROM public.profiles
WHERE id IN (SELECT id FROM test_users);

-- 4. 임시 테이블 정리
DROP TABLE test_users;

-- 5. 확인: 남은 프로필 목록 조회
SELECT p.id, p.full_name, u.email 
FROM public.profiles p
JOIN auth.users u ON p.id = u.id;

