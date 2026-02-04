-- =========================================================
-- 데이터베이스 상태 검증 스크립트
-- 1. 삭제되었어야 하는데 남아있는 지각 기록 (10:15:59 이하) 확인
-- 2. 추가되었어야 하는데 없는 지각 기록 (10:16:00 이상) 확인
-- =========================================================

-- 1. [오류] 지각이 아니어야 하는데 late_records에 있는 경우 (삭제 대상)
SELECT 'SHOULD_BE_DELETED' as status, user_id, late_date, check_in_time 
FROM late_records
WHERE 
  late_date >= '2026-01-08'
  AND (
    (check_in_time AT TIME ZONE 'Asia/Seoul')::time <= '10:15:59'::time
    OR
    EXTRACT(DOW FROM check_in_time AT TIME ZONE 'Asia/Seoul') IN (0, 6)
  );

-- 2. [오류] 지각이어야 하는데 late_records에 없는 경우 (추가 대상)
SELECT 'SHOULD_BE_ADDED' as status, user_id, DATE(created_at) as late_date, created_at as check_in_time
FROM attendance a
WHERE 
  type = 'check_in'
  AND created_at AT TIME ZONE 'Asia/Seoul' >= '2026-01-08 00:00:00'
  AND (created_at AT TIME ZONE 'Asia/Seoul')::time > '10:15:59'::time
  AND EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Seoul') NOT IN (0, 6)
  AND NOT EXISTS (
    SELECT 1 FROM late_records lr 
    WHERE lr.user_id = a.user_id 
      AND lr.late_date = DATE(a.created_at)
  );
