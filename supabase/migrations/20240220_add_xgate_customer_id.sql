-- Add xgate_customer_id column to users table
-- This stores the XGate customer ID created on the user's first PIX deposit
-- so we can sync profile updates (CPF, name, etc) back to XGate via PUT /customer/{id}

ALTER TABLE users
ADD COLUMN IF NOT EXISTS xgate_customer_id TEXT DEFAULT NULL;

-- Optional: index for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_xgate_customer_id ON users(xgate_customer_id)
WHERE xgate_customer_id IS NOT NULL;

COMMENT ON COLUMN users.xgate_customer_id IS 'XGate customer ID assigned on first PIX deposit. Used to sync profile changes back to XGate via PUT /customer/{id}.';
