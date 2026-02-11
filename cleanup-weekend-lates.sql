-- 주말(토, 일)에 생성된 지각 기록을 삭제하는 스크립트
-- late_date 기준으로 주말인 경우 삭제합니다.

BEGIN;

-- 1. 삭제 전 확인용 (실행 후 주석 처리 가능)
-- SELECT * FROM late_records
-- WHERE EXTRACT(DOW FROM late_date::date) IN (0, 6);

-- 2. 주말 지각 기록 삭제
DELETE FROM late_records
WHERE EXTRACT(DOW FROM late_date::date) IN (0, 6);

COMMIT;
