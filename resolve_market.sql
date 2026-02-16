-- Function to resolve a market and distribute payouts
-- Usage: SELECT resolve_market('market_uuid', 'YES');

CREATE OR REPLACE FUNCTION resolve_market(
  p_market_id UUID,
  p_outcome TEXT
) RETURNS VOID AS $$
DECLARE
  v_market_status market_status;
  v_total_pool DECIMAL;
  v_winning_pool DECIMAL;
  v_pool_after_fees DECIMAL;
  v_fee_percentage DECIMAL := 0.35; -- 35% Fee
  v_bet RECORD;
  v_payout DECIMAL;
  v_final_payout_pool DECIMAL;
BEGIN
  -- 1. Validate Input
  -- Note: We now support arbitrary text outcomes, so we removed the 'YES'/'NO' check
  -- IF p_outcome NOT IN ('YES', 'NO') THEN ... END IF;

  -- 2. Lock Market Row & Check Status
  -- We need to fetch the total pool and the winning pool (dynamically)
  -- Since we moved to JSONB pools or dynamic sums, we should calculate it properly.
  -- For now, let's assume `outcome_pools` column exists from recent migration.
  
  SELECT 
    status, 
    total_pool,
    COALESCE((outcome_pools ->> p_outcome)::DECIMAL, 0)
  INTO v_market_status, v_total_pool, v_winning_pool
  FROM markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF v_market_status != 'OPEN' THEN
    RAISE EXCEPTION 'Market is not OPEN (Current status: %)', v_market_status;
  END IF;

  -- 3. Calculate Pool After Fees
  v_pool_after_fees := v_total_pool * (1 - v_fee_percentage);
  
  -- 4. Update Market Status
  UPDATE markets
  SET 
    status = 'RESOLVED',
    resolution_result = p_outcome, -- Now TEXT
    end_date = NOW()
  WHERE id = p_market_id;

  -- 5. Process Winning Bets
  IF v_winning_pool > 0 THEN
    FOR v_bet IN 
      SELECT * FROM bets 
      WHERE market_id = p_market_id 
      AND side = p_outcome -- Now TEXT comparison
      AND status = 'ACTIVE'
    LOOP
      -- Calculate Payout: (BetAmount / WinningPool) * PoolAfterFees
      v_payout := (v_bet.amount / v_winning_pool) * v_pool_after_fees;

      -- Update User Balance
      UPDATE users
      SET balance = balance + v_payout
      WHERE id = v_bet.user_id;

      -- Update Bet Status
      UPDATE bets
      SET status = 'WON', potential_payout = v_payout
      WHERE id = v_bet.id;

      -- Log Transaction
      INSERT INTO transactions (user_id, type, amount, status, metadata)
      VALUES (
        v_bet.user_id, 
        'BET_WIN', 
        v_payout, 
        'COMPLETED', 
        jsonb_build_object('market_id', p_market_id, 'bet_id', v_bet.id, 'fee_deducted', TRUE)
      );
    END LOOP;
  ELSE
    -- House takes all (House wins if no one bet on the outcome)
    NULL; 
  END IF;

  -- 6. Mark Losing Bets
  UPDATE bets
  SET status = 'LOST'
  WHERE market_id = p_market_id 
  AND side != p_outcome 
  AND status = 'ACTIVE';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
