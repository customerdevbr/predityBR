-- FINAL FIX FOR TRANSACTIONS
-- 1. Ensure Permissions are Granted (In case they were revoked)
GRANT ALL ON TABLE transactions TO postgres;
GRANT ALL ON TABLE transactions TO anon;
GRANT ALL ON TABLE transactions TO authenticated;
GRANT ALL ON TABLE transactions TO service_role;

-- 2. Explicitly Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 3. DROP ALL EXISTING POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;
DROP POLICY IF EXISTS "Enable insert for users" ON transactions;

-- 4. RE-CREATE POLICIES

-- A. INSERT: Users can insert rows where user_id matches their auth.uid
CREATE POLICY "Enable insert for own transactions"
ON transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- B. SELECT: Users can see rows where user_id matches their auth.uid
CREATE POLICY "Enable read for own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

-- C. ADMIN SELECT: Admins can see ALL rows
CREATE POLICY "Enable read for admins"
ON transactions FOR SELECT
USING (is_admin());

-- D. ADMIN INSERT: Admins can insert ANY row (e.g. fees, manual adjustments)
CREATE POLICY "Enable insert for admins"
ON transactions FOR INSERT
WITH CHECK (is_admin());

-- 5. Fix USERS Updates (Just in case)
GRANT ALL ON TABLE users TO authenticated;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);
