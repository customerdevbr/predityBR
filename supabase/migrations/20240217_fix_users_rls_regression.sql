-- CRITICAL FIX: Allow users to view their OWN profile
-- The previous script enabled RLS but only added an ADMIN policy, locking out normal users.

CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Ensure Markets are viewable by everyone (Public)
-- If not already set, this ensures the landing page and app work
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Markets are viewable by everyone"
ON markets FOR SELECT
USING (true);

-- Ensure Bets are viewable by owner (already done? reinforcing)
CREATE POLICY "Users can view own bets"
ON bets FOR SELECT
USING (auth.uid() = user_id);
