-- ================================
-- 데이터 정합성 맞추기 (지각 기록 정리)
-- ================================

-- 1. 연차/반차가 이미 적용된 날짜의 지각 기록 삭제
DELETE FROM late_records lr
USING leave_records l
WHERE lr.user_id = l.user_id 
  AND lr.late_date = l.leave_date;

-- 2. 실제 출근 기록이 없는(삭제된) 지각 기록 삭제 (고아 레코드 정리)
DELETE FROM late_records lr
WHERE NOT EXISTS (
  SELECT 1 FROM attendance a
  WHERE a.user_id = lr.user_id
    AND DATE(a.created_at) = lr.late_date
    AND a.type = 'check_in'
);

-- 3. 출근은 했지만 지각 시간이 아닌데 지각으로 기록된거 삭제 (혹시 모를 오류 수정)
-- (is_late_check_in 함수 로직을 풀어서 사용)
DELETE FROM late_records lr
USING attendance a
WHERE lr.user_id = a.user_id
  AND DATE(a.created_at) = lr.late_date
  AND a.type = 'check_in'
  AND NOT (
    (a.created_at AT TIME ZONE 'Asia/Seoul')::time > '10:10:00'::time
  );
