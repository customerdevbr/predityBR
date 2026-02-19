-- Add resolved_at column to markets
ALTER TABLE markets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Re-run the function creation just to be sure it's compiled against the new schema context if needed (Postgres is usually fine, but good practice)
CREATE OR REPLACE FUNCTION void_market(market_id UUID) RETURNS VOID AS $$
DECLARE
    bet_record RECORD;
BEGIN
    -- 1. Mark Market as CANCELED/VOIDED
    UPDATE markets 
    SET status = 'CANCELED',
        resolved_at = NOW()
    WHERE id = market_id;

    -- 2. Refund Users
    FOR bet_record IN 
        SELECT * FROM bets WHERE market_id = market_id AND status = 'ACTIVE'
    LOOP
        -- Credit back the amount to user balance
        UPDATE users 
        SET balance = balance + bet_record.amount
        WHERE id = bet_record.user_id;

        -- Create a transaction record for the refund
        INSERT INTO transactions (user_id, amount, type, description, created_at)
        VALUES (bet_record.user_id, bet_record.amount, 'REFUND', 'Reembolso por anulação de mercado: ' || market_id, NOW());

        -- Mark bet as VOIDED
        UPDATE bets 
        SET status = 'VOIDED'
        WHERE id = bet_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
