-- 1. Add Shares Column to tracking predictions
ALTER TABLE public.bets ADD COLUMN IF NOT EXISTS shares DECIMAL(15, 6) DEFAULT 0.0;

-- 2. Add Pool Snapshot Column to log the exact state of the pool
ALTER TABLE public.bets ADD COLUMN IF NOT EXISTS pool_snapshot JSONB;
