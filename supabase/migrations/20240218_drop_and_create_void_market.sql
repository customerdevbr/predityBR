-- Drop the old function first because we are changing parameter names
DROP FUNCTION IF EXISTS void_market(uuid);

-- Re-create with new parameter name p_market_id
CREATE OR REPLACE FUNCTION void_market(p_market_id UUID) RETURNS VOID AS $$
DECLARE
    bet_record RECORD;
BEGIN
    -- 1. Mark Market as CANCELED/VOIDED
    UPDATE markets 
    SET status = 'CANCELED',
        resolved_at = NOW()
    WHERE id = p_market_id;

    -- 2. Refund Users
    FOR bet_record IN 
        SELECT * FROM bets WHERE market_id = p_market_id AND status = 'ACTIVE'
    LOOP
        -- Credit back the amount to user balance
        UPDATE users 
        SET balance = balance + bet_record.amount
        WHERE id = bet_record.user_id;

        -- Create a transaction record for the refund
        INSERT INTO transactions (user_id, amount, type, description, created_at)
        VALUES (bet_record.user_id, bet_record.amount, 'REFUND', 'Reembolso por anulação de mercado: ' || p_market_id::text, NOW());

        -- Mark bet as VOIDED
        UPDATE bets 
        SET status = 'VOIDED'
        WHERE id = bet_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
