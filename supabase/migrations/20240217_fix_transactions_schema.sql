-- FIX TRANSACTIONS SCHEMA (MISSING COLUMN & ENUMS)

-- 1. Add missing 'description' column
-- The frontend tries to insert 'description', but it didn't exist in the table.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'description') THEN
        ALTER TABLE transactions ADD COLUMN description TEXT;
    END IF;
END $$;

-- 2. Convert Types to TEXT
-- This prevents errors if we try to insert a type (e.g. 'FEE', 'CASHOUT') that wasn't in the original ENUM list.
-- It's safer and more flexible.
ALTER TABLE transactions ALTER COLUMN type TYPE TEXT;
ALTER TABLE transactions ALTER COLUMN status TYPE TEXT;
ALTER TABLE transactions ALTER COLUMN provider TYPE TEXT;

-- 3. Grant Permissions (Just to be triple sure)
GRANT ALL ON TABLE transactions TO authenticated;
GRANT ALL ON TABLE transactions TO service_role;
