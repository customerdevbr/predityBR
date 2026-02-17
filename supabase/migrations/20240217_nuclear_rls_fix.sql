-- NUCLEAR FIX (Use if everything else fails)

-- 1. Markets: Disable RLS entirely (Public Data)
-- This guarantees that cards will show up.
ALTER TABLE markets DISABLE ROW LEVEL SECURITY;

-- 2. Users: Force RLS refresh
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop verify policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;

-- Re-create simple policy for owner
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Re-create admin policy
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users AS u
    WHERE u.id = auth.uid() 
    AND u.role = 'ADMIN'
  )
);

-- 3. Bets: Ensure readability
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own bets" ON bets;

CREATE POLICY "Users can view own bets"
ON bets FOR SELECT
USING (auth.uid() = user_id);
