-- ==========================================
-- 지각 데이터 재보정 (2026-01-08 부터)
-- ==========================================

DO $$
DECLARE
  r RECORD;
  start_date date := '2026-01-08';
BEGIN
  -- 1. 잘못된 주말 지각 기록 삭제
  DELETE FROM late_records
  WHERE late_date >= start_date
    AND (
      EXTRACT(DOW FROM late_date) = 0 -- 일요일
      OR 
      EXTRACT(DOW FROM late_date) = 6 -- 토요일
    );

  -- 2. 기간 내 누락된 지각 기록 다시 확인 및 추가
  FOR r IN 
    SELECT * FROM attendance
    WHERE type = 'check_in'
      AND created_at >= start_date::timestamp
  LOOP
    -- is_late_check_in 함수가 이미 업데이트되어 주말을 제외하고 10:10 이후만 true 반환
    IF is_late_check_in(r.created_at) THEN
      INSERT INTO late_records (user_id, late_date, check_in_time, quarter)
      VALUES (
        r.user_id, 
        DATE(r.created_at), 
        r.created_at, 
        TO_CHAR(r.created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-"Q"Q')
      )
      ON CONFLICT (user_id, late_date) DO NOTHING;
    END IF;
  END LOOP;
END $$;
