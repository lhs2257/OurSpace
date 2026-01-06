-- profiles 테이블에 테마 색상 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN theme_color VARCHAR(20) DEFAULT 'blue';

-- 기존 데이터에도 기본값 적용
UPDATE public.profiles 
SET theme_color = 'blue' 
WHERE theme_color IS NULL;
