-- ================================
-- 과거 지각 기록 일괄 반영 (Backfill)
-- ================================

-- 기존 출근 기록 중 지각인 건들을 찾아 late_records에 추가합니다.
-- 이미 기록된 건은 무시합니다 (ON CONFLICT DO NOTHING).

INSERT INTO late_records (user_id, late_date, check_in_time, quarter)
SELECT 
  user_id,
  DATE(created_at) as late_date,
  created_at as check_in_time,
  TO_CHAR(created_at, 'YYYY-"Q"Q') as quarter
FROM attendance
WHERE type = 'check_in'
  -- 지각 판정 로직 (한국 시간 기준)
  AND (
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul') > 10
    OR (
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul') = 10 
      AND EXTRACT(MINUTE FROM created_at AT TIME ZONE 'Asia/Seoul') > 10
    )
  )
  -- 2026년 이후 기록만 대상 (한국 시간 기준)
  AND created_at AT TIME ZONE 'Asia/Seoul' >= '2026-01-08 00:00:00'
ON CONFLICT (user_id, late_date) DO NOTHING;

-- 결과 확인
SELECT * FROM late_records ORDER BY check_in_time DESC;
