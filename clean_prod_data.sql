-- Clean Production Data Script
-- WARNING: This will delete ALL bets, transactions, logs, and reset all user balances and market pools!
-- Users and Markets will REMAIN.

-- 1. Truncate Dependent Activity
TRUNCATE TABLE public.activity_logs CASCADE;
TRUNCATE TABLE public.support_messages CASCADE;
TRUNCATE TABLE public.support_tickets CASCADE;

-- 2. Clear Financial Ledgers
TRUNCATE TABLE public.transactions CASCADE;
TRUNCATE TABLE public.referral_commissions CASCADE;
TRUNCATE TABLE public.bets CASCADE;

-- 3. Reset All Markets to Virgin State
UPDATE public.markets
SET 
  total_pool = 0,
  total_yes_amount = 0,
  total_no_amount = 0,
  outcome_pools = '{}',
  status = 'OPEN',
  resolution_result = NULL
WHERE total_pool > 0 OR status != 'OPEN';

-- 4. Reset All User Balances
UPDATE public.users
SET balance = 0.00;
