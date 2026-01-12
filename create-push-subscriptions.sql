-- ==========================================
-- 푸시 알림 구독 저장을 위한 테이블 생성
-- ==========================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS 활성화
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON push_subscriptions;

-- RLS 정책: 자신의 구독 정보만 관리(조회, 추가, 삭제) 가능
CREATE POLICY "Users can manage their own subscriptions"
  ON push_subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
