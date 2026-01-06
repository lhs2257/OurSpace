-- 현재 사용자 프로필 확인 및 수동 업데이트

-- 1. 먼저 현재 프로필 상태 확인
SELECT id, email, raw_user_meta_data FROM auth.users;
SELECT * FROM public.profiles;

-- 2. 프로필이 비어있거나 full_name이 null이면 수동으로 업데이트
-- auth.users의 정보를 profiles에 복사

-- 방법 1: 기존 사용자들의 프로필 업데이트 (full_name이 비어있는 경우)
UPDATE public.profiles
SET full_name = (
    SELECT raw_user_meta_data->>'full_name'
    FROM auth.users
    WHERE auth.users.id = profiles.id
)
WHERE full_name IS NULL OR full_name = '';

-- 방법 2: 프로필이 아예 없는 사용자를 위해 수동으로 생성
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', email),
    ''
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 3. 확인
SELECT 
    p.id,
    p.full_name,
    u.email,
    u.raw_user_meta_data->>'full_name' as metadata_name
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id;

-- 이 쿼리를 실행한 후 브라우저를 새로고침하면 이름이 제대로 표시될 것입니다!

