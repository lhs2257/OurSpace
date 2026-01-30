-- ================================
-- 연차/반차 관리 시스템
-- ================================

-- 1. 연차/반차 기록 테이블 생성
CREATE TABLE IF NOT EXISTS leave_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  leave_date date NOT NULL,
  leave_type text CHECK (leave_type IN ('annual', 'half')) NOT NULL,
  month_year text NOT NULL, -- 'YYYY-MM' 형식
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, leave_date)
);

-- 2. 월별 연차/반차 잔여 개수 테이블
CREATE TABLE IF NOT EXISTS leave_balance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_year text NOT NULL, -- 'YYYY-MM' 형식
  annual_remaining integer DEFAULT 1 NOT NULL,
  half_remaining integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_leave_records_user_month ON leave_records(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_leave_records_date ON leave_records(leave_date);
CREATE INDEX IF NOT EXISTS idx_leave_balance_user_month ON leave_balance(user_id, month_year);

-- RLS 활성화
ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balance ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Anyone can view leave records" ON leave_records;
DROP POLICY IF EXISTS "System can manage leave records" ON leave_records;
DROP POLICY IF EXISTS "Anyone can view leave balance" ON leave_balance;
DROP POLICY IF EXISTS "System can manage leave balance" ON leave_balance;

-- RLS 정책: 모든 인증된 사용자가 조회 가능
CREATE POLICY "Anyone can view leave records"
  ON leave_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage leave records"
  ON leave_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view leave balance"
  ON leave_balance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage leave balance"
  ON leave_balance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. 월별 연차/반차 잔여 개수 조회 (없으면 생성)
CREATE OR REPLACE FUNCTION get_or_create_leave_balance(
  p_user_id uuid,
  p_month_year text
)
RETURNS TABLE (
  annual_remaining integer,
  half_remaining integer
) AS $$
DECLARE
  v_annual integer;
  v_half integer;
BEGIN
  -- 기존 레코드 조회
  SELECT lb.annual_remaining, lb.half_remaining
  INTO v_annual, v_half
  FROM leave_balance lb
  WHERE lb.user_id = p_user_id
    AND lb.month_year = p_month_year;

  -- 없으면 새로 생성
  IF v_annual IS NULL THEN
    INSERT INTO leave_balance (user_id, month_year, annual_remaining, half_remaining)
    VALUES (p_user_id, p_month_year, 1, 1)
    RETURNING leave_balance.annual_remaining, leave_balance.half_remaining
    INTO v_annual, v_half;
  END IF;

  RETURN QUERY SELECT v_annual, v_half;
END;
$$ LANGUAGE plpgsql;

-- 4. 연차/반차 신청 함수
CREATE OR REPLACE FUNCTION apply_leave_record(
  p_user_id uuid,
  p_leave_date date,
  p_leave_type text
)
RETURNS json AS $$
DECLARE
  v_month_year text;
  v_annual_remaining integer;
  v_half_remaining integer;
  v_leave_id uuid;
BEGIN
  -- 월년 계산
  v_month_year := TO_CHAR(p_leave_date, 'YYYY-MM');

  -- 잔여 개수 확인
  SELECT annual_remaining, half_remaining
  INTO v_annual_remaining, v_half_remaining
  FROM get_or_create_leave_balance(p_user_id, v_month_year);

  -- 잔여 개수 확인
  IF p_leave_type = 'annual' AND v_annual_remaining <= 0 THEN
    RETURN json_build_object('success', false, 'error', '연차가 부족합니다.');
  END IF;

  IF p_leave_type = 'half' AND v_half_remaining <= 0 THEN
    RETURN json_build_object('success', false, 'error', '반차가 부족합니다.');
  END IF;

  -- 연차/반차 기록 추가 (이미 있으면 업데이트)
  INSERT INTO leave_records (user_id, leave_date, leave_type, month_year)
  VALUES (p_user_id, p_leave_date, p_leave_type, v_month_year)
  ON CONFLICT (user_id, leave_date) 
  DO UPDATE SET leave_type = p_leave_type, month_year = v_month_year
  RETURNING id INTO v_leave_id;

  -- 잔여 개수 감소
  IF p_leave_type = 'annual' THEN
    UPDATE leave_balance
    SET annual_remaining = annual_remaining - 1, updated_at = now()
    WHERE user_id = p_user_id AND month_year = v_month_year;
  ELSE
    UPDATE leave_balance
    SET half_remaining = half_remaining - 1, updated_at = now()
    WHERE user_id = p_user_id AND month_year = v_month_year;
  END IF;

  -- 해당 날짜의 지각 기록 삭제 (있을 경우)
  DELETE FROM late_records
  WHERE user_id = p_user_id AND late_date = p_leave_date;

  RETURN json_build_object('success', true, 'leave_id', v_leave_id);
END;
$$ LANGUAGE plpgsql;

-- 5. 연차/반차 취소 함수
CREATE OR REPLACE FUNCTION cancel_leave_record(
  p_user_id uuid,
  p_leave_date date
)
RETURNS json AS $$
DECLARE
  v_month_year text;
  v_leave_type text;
  v_check_in_time timestamp with time zone;
BEGIN
  -- 월년 계산
  v_month_year := TO_CHAR(p_leave_date, 'YYYY-MM');

  -- 기존 연차/반차 타입 조회
  SELECT leave_type INTO v_leave_type
  FROM leave_records
  WHERE user_id = p_user_id AND leave_date = p_leave_date;

  IF v_leave_type IS NULL THEN
    RETURN json_build_object('success', false, 'error', '해당 날짜에 연차/반차 기록이 없습니다.');
  END IF;

  -- 연차/반차 기록 삭제
  DELETE FROM leave_records
  WHERE user_id = p_user_id AND leave_date = p_leave_date;

  -- 잔여 개수 복구
  IF v_leave_type = 'annual' THEN
    UPDATE leave_balance
    SET annual_remaining = annual_remaining + 1, updated_at = now()
    WHERE user_id = p_user_id AND month_year = v_month_year;
  ELSE
    UPDATE leave_balance
    SET half_remaining = half_remaining + 1, updated_at = now()
    WHERE user_id = p_user_id AND month_year = v_month_year;
  END IF;

  -- [추가됨] 지각 기록 복구 로직 (이미 지각했는데 연차로 면제된 경우 다시 복구)
  -- 해당 날짜의 출근 기록 조회
  SELECT created_at INTO v_check_in_time
  FROM attendance
  WHERE user_id = p_user_id 
    AND DATE(created_at) = p_leave_date
    AND type = 'check_in'
  LIMIT 1;

  -- 출근 기록이 있고 원래 지각이었으면 다시 late_records에 추가
  IF v_check_in_time IS NOT NULL AND is_late_check_in(v_check_in_time) THEN
    INSERT INTO late_records (user_id, late_date, check_in_time, quarter)
    VALUES (p_user_id, p_leave_date, v_check_in_time, get_current_quarter())
    ON CONFLICT (user_id, late_date) DO NOTHING;
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 6. 특정 월의 연차/반차 기록 조회 함수
CREATE OR REPLACE FUNCTION get_leave_records_for_month(
  p_user_id uuid,
  p_month_year text
)
RETURNS TABLE (
  leave_date date,
  leave_type text,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT lr.leave_date, lr.leave_type, lr.created_at
  FROM leave_records lr
  WHERE lr.user_id = p_user_id
    AND lr.month_year = p_month_year
  ORDER BY lr.leave_date ASC;
END;
$$ LANGUAGE plpgsql;

-- 7. 특정 날짜가 연차/반차인지 확인 함수
CREATE OR REPLACE FUNCTION is_leave_date(
  p_user_id uuid,
  p_date date
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM leave_records
    WHERE user_id = p_user_id AND leave_date = p_date
  );
END;
$$ LANGUAGE plpgsql;

-- 8. 지각 기록 함수 업데이트 (연차/반차 날짜 제외)
CREATE OR REPLACE FUNCTION record_late_if_needed()
RETURNS trigger AS $$
BEGIN
  -- 출근 체크이고 지각인 경우에만 기록
  -- 단, 해당 날짜가 연차/반차가 아닌 경우에만
  IF NEW.type = 'check_in' 
     AND is_late_check_in(NEW.created_at)
     AND NOT is_leave_date(NEW.user_id, DATE(NEW.created_at)) THEN
    INSERT INTO late_records (user_id, late_date, check_in_time, quarter)
    VALUES (NEW.user_id, DATE(NEW.created_at), NEW.created_at, get_current_quarter())
    ON CONFLICT (user_id, late_date) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
