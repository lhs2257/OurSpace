-- ==========================================
-- 지각 정책 업데이트: 날짜별 기준 적용
-- 1월: 10:10 초과 시 지각
-- 2월 이후: 10:16 부터 지각 (10:15:59 까지 정상)
-- ==========================================

-- 1. 지각 판정 함수 업데이트
CREATE OR REPLACE FUNCTION is_late_check_in(check_in_time timestamp with time zone)
RETURNS boolean AS $$
DECLARE
  kst_time timestamp;
  time_only time;
  cutoff_time time;
  day_of_week integer; -- 0: 일요일, 6: 토요일
  is_feb_or_later boolean;
BEGIN
  -- 입력된 시간을 한국 시간으로 변환
  kst_time := check_in_time AT TIME ZONE 'Asia/Seoul';
  
  -- 요일 확인 (0: Sun, 1: Mon, ..., 6: Sat)
  day_of_week := EXTRACT(DOW FROM kst_time)::integer;
  
  -- 주말이면 지각 아님
  IF day_of_week = 0 OR day_of_week = 6 THEN
    RETURN false;
  END IF;

  -- 2월 1일 기준 분기 처리
  IF kst_time >= '2026-02-01 00:00:00' THEN
    -- 2월 이후: 10시 16분'부터' 지각 (즉, 10:15:59 초과)
    cutoff_time := '10:15:59';
  ELSE
    -- 1월 이전: 10시 10분'초과' 지각 (기존 룰)
    cutoff_time := '10:10:00';
  END IF;

  -- 시간 비교
  time_only := kst_time::time;
  
  RETURN time_only > cutoff_time;
END;
$$ LANGUAGE plpgsql;

-- 2. [Cleanup] 2월 이후 기록 중 잘못된 지각 삭제 (10:16 미만인 경우 삭제)
-- 10:11 ~ 10:15:59 사이에 찍힌 기록들이 삭제됨
DELETE FROM late_records
WHERE 
  -- 2월 1일 이후 기록이면서
  late_date >= '2026-02-01'
  AND (
    -- 10시 15분 59초 이하인 경우 (정상 출근)
    (check_in_time AT TIME ZONE 'Asia/Seoul')::time <= '10:15:59'::time
    OR
    -- 주말인 경우 (안전장치)
    EXTRACT(DOW FROM check_in_time AT TIME ZONE 'Asia/Seoul') IN (0, 6)
  );

-- 3. [Backfill] 2월 이후 누락된 지각 기록 추가 (10:16 이상)
INSERT INTO late_records (user_id, late_date, check_in_time, quarter)
SELECT 
  user_id,
  DATE(created_at) as late_date,
  created_at as check_in_time,
  TO_CHAR(created_at, 'YYYY-"Q"Q') as quarter
FROM attendance
WHERE type = 'check_in'
  -- 2월 1일 이후
  AND created_at AT TIME ZONE 'Asia/Seoul' >= '2026-02-01 00:00:00'
  -- 10시 15분 59초 초과 (10:16 부터)
  AND (created_at AT TIME ZONE 'Asia/Seoul')::time > '10:15:59'::time
  -- 주말 제외
  AND EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Seoul') NOT IN (0, 6)
ON CONFLICT (user_id, late_date) DO NOTHING;

-- 4. [Safe Keep] 1월 데이터는 건드리지 않음 (혹시 몰라 1월 누락분만 살짝 체크)
-- 1월: 10:10 초과
INSERT INTO late_records (user_id, late_date, check_in_time, quarter)
SELECT 
  user_id,
  DATE(created_at) as late_date,
  created_at as check_in_time,
  TO_CHAR(created_at, 'YYYY-"Q"Q') as quarter
FROM attendance
WHERE type = 'check_in'
  -- 2월 1일 이전
  AND created_at AT TIME ZONE 'Asia/Seoul' < '2026-02-01 00:00:00'
  AND created_at >= '2026-01-01 00:00:00+09'
  -- 10시 10분 초과
  AND (created_at AT TIME ZONE 'Asia/Seoul')::time > '10:10:00'::time
  AND EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Seoul') NOT IN (0, 6)
ON CONFLICT (user_id, late_date) DO NOTHING;
