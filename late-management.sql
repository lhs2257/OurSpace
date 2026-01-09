-- ================================
-- 지각 관리 시스템 (4아웃제)
-- ================================

-- 1. 지각 기록 테이블 생성
CREATE TABLE IF NOT EXISTS late_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  late_date date NOT NULL,
  check_in_time timestamp with time zone NOT NULL,
  quarter text NOT NULL, -- '2026-Q1' 형식
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, late_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_late_records_user_quarter ON late_records(user_id, quarter);
CREATE INDEX IF NOT EXISTS idx_late_records_quarter ON late_records(quarter);

-- RLS 활성화
ALTER TABLE late_records ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Anyone can view late records" ON late_records;
DROP POLICY IF EXISTS "System can insert late records" ON late_records;

-- RLS 정책: 모든 인증된 사용자가 조회 가능
CREATE POLICY "Anyone can view late records"
  ON late_records FOR SELECT
  TO authenticated
  USING (true);

-- RLS 정책: 시스템(트리거)이 삽입 가능
CREATE POLICY "System can insert late records"
  ON late_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. 현재 분기 계산 함수 (한국 시간 기준)
CREATE OR REPLACE FUNCTION get_current_quarter()
RETURNS text AS $$
BEGIN
  RETURN TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul', 'YYYY-"Q"Q');
END;
$$ LANGUAGE plpgsql;

-- 3. 지각 판정 함수 (10:10 기준, 한국 시간)
CREATE OR REPLACE FUNCTION is_late_check_in(check_in_time timestamp with time zone)
RETURNS boolean AS $$
DECLARE
  kst_time timestamp;
  time_only time;
  cutoff_time time := '10:10:00';
BEGIN
  -- 입력된 시간을 한국 시간으로 변환
  kst_time := check_in_time AT TIME ZONE 'Asia/Seoul';
  time_only := kst_time::time;
  
  RETURN time_only > cutoff_time;
END;
$$ LANGUAGE plpgsql;

-- 4. 지각 기록 자동 생성 함수
CREATE OR REPLACE FUNCTION record_late_if_needed()
RETURNS trigger AS $$
BEGIN
  -- 출근 체크이고 지각인 경우에만 기록
  IF NEW.type = 'check_in' AND is_late_check_in(NEW.created_at) THEN
    INSERT INTO late_records (user_id, late_date, check_in_time, quarter)
    VALUES (NEW.user_id, DATE(NEW.created_at), NEW.created_at, get_current_quarter())
    ON CONFLICT (user_id, late_date) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 트리거 생성 (출근 체크 시 자동으로 지각 판정)
DROP TRIGGER IF EXISTS check_late_on_checkin ON attendance;
CREATE TRIGGER check_late_on_checkin
  AFTER INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION record_late_if_needed();

-- 6. 현재 분기 지각 횟수 조회 함수
CREATE OR REPLACE FUNCTION get_late_count_current_quarter(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM late_records
    WHERE user_id = p_user_id
      AND quarter = get_current_quarter()
  );
END;
$$ LANGUAGE plpgsql;
