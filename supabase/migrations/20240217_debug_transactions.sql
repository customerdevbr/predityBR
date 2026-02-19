-- INSPECT TRANSACTIONS TABLE
-- 1. Check Columns and Types
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions';

-- 2. Try to Insert a Dummy Transaction (to see error)
-- Replace 'USER_ID_HERE' with a valid user ID if testing manually, 
-- but for now we just want to see if it even compiles or hits a constraint.
-- We use a DO block to try/catch
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Get a valid user ID to test
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.transactions (user_id, type, amount, status, description)
        VALUES (v_user_id, 'DEPOSIT', 10.00, 'COMPLETED', 'Test Transaction script');
        
        RAISE NOTICE 'Insert worked!';
    ELSE
        RAISE NOTICE 'No user found to test insert.';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Insert Failed: %', SQLERRM;
END $$;
