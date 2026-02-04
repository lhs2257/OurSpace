-- 지각 기록 상세 조회
SELECT 
  u.email,
  lr.late_date, 
  lr.check_in_time AT TIME ZONE 'Asia/Seoul' as kst_check_in,
  (lr.check_in_time AT TIME ZONE 'Asia/Seoul')::time as time_only
FROM late_records lr
JOIN auth.users u ON lr.user_id = u.id
ORDER BY lr.late_date DESC, time_only DESC;
