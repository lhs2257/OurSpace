-- Supabase Realtime 활성화
-- attendance 테이블의 변경사항을 실시간으로 구독할 수 있도록 설정합니다

-- 1. attendance 테이블을 realtime publication에 추가
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- 2. 확인: 다음 쿼리로 realtime이 활성화되었는지 확인
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 이제 브라우저를 새로고침하고 두 개의 탭을 열어서 테스트하세요!
-- 한 탭에서 출퇴근 → 다른 탭에서 자동으로 업데이트되어야 합니다.
