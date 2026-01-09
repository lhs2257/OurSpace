-- 근무시간 계산 함수
-- 특정 날짜의 check_in과 check_out을 매칭하여 근무시간 계산
CREATE OR REPLACE FUNCTION calculate_work_hours(
  p_user_id uuid,
  p_date date
) RETURNS interval AS $$
DECLARE
  v_check_in timestamp with time zone;
  v_check_out timestamp with time zone;
BEGIN
  -- 해당 날짜의 첫 출근 기록
  SELECT created_at INTO v_check_in
  FROM attendance
  WHERE user_id = p_user_id
    AND type = 'check_in'
    AND DATE(created_at) = p_date
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- 해당 날짜의 마지막 퇴근 기록
  SELECT created_at INTO v_check_out
  FROM attendance
  WHERE user_id = p_user_id
    AND type = 'check_out'
    AND DATE(created_at) = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 둘 다 있으면 시간 차이 반환
  IF v_check_in IS NOT NULL AND v_check_out IS NOT NULL THEN
    RETURN v_check_out - v_check_in;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 오늘의 근태 상태 조회 함수
CREATE OR REPLACE FUNCTION get_today_attendance_status(p_user_id uuid)
RETURNS TABLE (
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  work_duration interval,
  is_checked_in boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT created_at FROM attendance 
     WHERE user_id = p_user_id 
       AND type = 'check_in' 
       AND DATE(created_at) = CURRENT_DATE 
     ORDER BY created_at ASC LIMIT 1) as check_in_time,
    (SELECT created_at FROM attendance 
     WHERE user_id = p_user_id 
       AND type = 'check_out' 
       AND DATE(created_at) = CURRENT_DATE 
     ORDER BY created_at DESC LIMIT 1) as check_out_time,
    calculate_work_hours(p_user_id, CURRENT_DATE) as work_duration,
    EXISTS(
      SELECT 1 FROM attendance 
      WHERE user_id = p_user_id 
        AND type = 'check_in' 
        AND DATE(created_at) = CURRENT_DATE
        AND NOT EXISTS(
          SELECT 1 FROM attendance a2 
          WHERE a2.user_id = p_user_id 
            AND a2.type = 'check_out'
            AND DATE(a2.created_at) = CURRENT_DATE
            AND a2.created_at > attendance.created_at
        )
    ) as is_checked_in;
END;
$$ LANGUAGE plpgsql;