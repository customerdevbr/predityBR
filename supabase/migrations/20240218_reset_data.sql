-- DATA RESET SCRIPT
-- WARNING: This will delete all data except Users!

-- 1. Support
DELETE FROM support_messages;
DELETE FROM support_tickets;

-- 2. Financials & Bets
DELETE FROM bets;
DELETE FROM transactions;

-- 3. Markets (Optional - Uncomment if you want to delete Markets too)
DELETE FROM markets;

-- 4. Users (Reset Balance)
UPDATE users SET balance = 0;
