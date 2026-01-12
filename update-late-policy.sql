-- ==========================================
-- 지각 정책 업데이트: 주말(토, 일) 제외
-- ==========================================

-- 지각 판정 함수 업데이트 (10:10 기준, 한국 시간, 주말 제외)
CREATE OR REPLACE FUNCTION is_late_check_in(check_in_time timestamp with time zone)
RETURNS boolean AS $$
DECLARE
  kst_time timestamp;
  time_only time;
  cutoff_time time := '10:10:00';
  day_of_week integer; -- 0: 일요일, 6: 토요일
BEGIN
  -- 입력된 시간을 한국 시간으로 변환
  kst_time := check_in_time AT TIME ZONE 'Asia/Seoul';
  
  -- 요일 확인 (0: Sun, 1: Mon, ..., 6: Sat)
  day_of_week := EXTRACT(DOW FROM kst_time)::integer;
  
  -- 주말이면 지각 아님
  IF day_of_week = 0 OR day_of_week = 6 THEN
    RETURN false;
  END IF;

  -- 시간 비교
  time_only := kst_time::time;
  
  RETURN time_only > cutoff_time;
END;
$$ LANGUAGE plpgsql;
