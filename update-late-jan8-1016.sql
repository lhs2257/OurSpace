-- ==========================================
-- 지각 정책 업데이트: 2026년 1월 8일부터 적용
-- 기준: 10:16 부터 지각 (10:15:59 까지 정상)
-- ==========================================

-- 1. 지각 판정 함수 업데이트
-- (현재 시점 이후의 모든 판정에 사용됨)
CREATE OR REPLACE FUNCTION is_late_check_in(check_in_time timestamp with time zone)
RETURNS boolean AS $$
DECLARE
  kst_time timestamp;
  time_only time;
  cutoff_time time := '10:15:59'; -- 10시 16분 00초부터 지각
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

-- 2. [Cleanup] 1월 8일 이후 기록 중 지각이 아닌 건 삭제
-- 기준: 10시 15분 59초 이하 (정상 출근) 또는 주말
DELETE FROM late_records
WHERE 
  late_date >= '2026-01-08'
  AND (
    (check_in_time AT TIME ZONE 'Asia/Seoul')::time <= '10:15:59'::time
    OR
    EXTRACT(DOW FROM check_in_time AT TIME ZONE 'Asia/Seoul') IN (0, 6)
  );

-- 3. [Backfill] 1월 8일 이후 누락된 지각 기록 추가
-- 기준: 10시 15분 59초 초과 (지각)
INSERT INTO late_records (user_id, late_date, check_in_time, quarter)
SELECT 
  user_id,
  DATE(created_at) as late_date,
  created_at as check_in_time,
  TO_CHAR(created_at, 'YYYY-"Q"Q') as quarter
FROM attendance
WHERE type = 'check_in'
  -- 2026년 1월 8일 이후
  AND created_at AT TIME ZONE 'Asia/Seoul' >= '2026-01-08 00:00:00'
  -- 10시 16분 00초 부터 (초과)
  AND (created_at AT TIME ZONE 'Asia/Seoul')::time > '10:15:59'::time
  -- 주말 제외
  AND EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Seoul') NOT IN (0, 6)
ON CONFLICT (user_id, late_date) DO NOTHING;
