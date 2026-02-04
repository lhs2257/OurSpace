-- ==========================================
-- 지각 정책 업데이트 및 과거 기록 재반영
-- 기준: 10시 15분 (주말 제외)
-- ==========================================

-- 1. 지각 판정 함수 업데이트 (10:15 기준, 한국 시간, 주말 제외)
CREATE OR REPLACE FUNCTION is_late_check_in(check_in_time timestamp with time zone)
RETURNS boolean AS $$
DECLARE
  kst_time timestamp;
  time_only time;
  cutoff_time time := '10:15:00';
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

-- 2. [Cleanup] 기존 기록 중 지각이 아닌 건 삭제 (10:15 이하 or 주말)
-- 이미 10:11~10:15 사이로 기록된 건들이 삭제됩니다.
DELETE FROM late_records
WHERE (
  -- 한국 시간 기준 10시 15분 이하인 경우
  (check_in_time AT TIME ZONE 'Asia/Seoul')::time <= '10:15:00'::time
) OR (
  -- 주말인 경우 (안전장치)
  EXTRACT(DOW FROM check_in_time AT TIME ZONE 'Asia/Seoul') IN (0, 6)
);

-- 3. [Backfill] 누락된 지각 기록 추가 (10:15 초과 & 평일)
-- 과거 기록 중 10:15를 넘었는데 지각으로 기록되지 않은 건을 찾아서 넣습니다.
INSERT INTO late_records (user_id, late_date, check_in_time, quarter)
SELECT 
  user_id,
  DATE(created_at) as late_date,
  created_at as check_in_time,
  TO_CHAR(created_at, 'YYYY-"Q"Q') as quarter
FROM attendance
WHERE type = 'check_in'
  -- 10시 15분 초과 (한국 시간)
  AND (created_at AT TIME ZONE 'Asia/Seoul')::time > '10:15:00'::time
  -- 주말 제외
  AND EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Seoul') NOT IN (0, 6)
  -- 2026년 이후 기록만 (필요시 조정 가능)
  AND created_at >= '2026-01-01 00:00:00+09'
ON CONFLICT (user_id, late_date) DO NOTHING;
