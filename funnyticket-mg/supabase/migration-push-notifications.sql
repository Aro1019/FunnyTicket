-- Migration: Push notification subscriptions
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (for cron/API) can read all
CREATE POLICY "Service role can read all subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.role() = 'service_role');

-- Index for fast lookup
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Track which notifications have been sent to avoid duplicates
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  alert_type text NOT NULL, -- '1h', '30m', '5m', 'expired'
  sent_at timestamptz DEFAULT now(),
  UNIQUE(ticket_id, alert_type)
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage notification_log"
  ON notification_log FOR ALL
  USING (true)
  WITH CHECK (true);
