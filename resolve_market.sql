-- Fix resolve_market: use 'amount' instead of non-existent 'shares' column
-- In pari-mutuel, each user's share IS their bet amount

CREATE OR REPLACE FUNCTION resolve_market(
  p_market_id UUID,
  p_outcome TEXT
) RETURNS VOID AS $$
DECLARE
  v_market_status market_status;
  v_total_pool DECIMAL;
  v_winning_pool DECIMAL;
  
  v_fee_percentage DECIMAL := 0.35; -- 35% Fee on PROFIT ONLY
  v_lucro_bruto DECIMAL;
  v_lucro_distribuivel DECIMAL;
  v_pagamento_total_vencedores DECIMAL;
  
  v_total_winning_amount DECIMAL;
  v_bet RECORD;
  v_payout DECIMAL;
BEGIN
  -- 1. Lock Market Row & Check Status
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

  -- 2. Calculate True Parimutuel Mathematics
  v_lucro_bruto := v_total_pool - v_winning_pool;
  v_lucro_distribuivel := v_lucro_bruto * (1 - v_fee_percentage);
  
  -- Pool for winners = their own money back + redistributed profit
  v_pagamento_total_vencedores := v_winning_pool + v_lucro_distribuivel;

  -- Get total amount bet on winning side (this IS the shares)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_winning_amount
  FROM bets
  WHERE market_id = p_market_id AND side = p_outcome AND status = 'ACTIVE';

  -- 3. Update Market Status
  UPDATE markets
  SET 
    status = 'RESOLVED',
    resolution_result = p_outcome,
    end_date = NOW()
  WHERE id = p_market_id;

  -- 4. Process Winning Bets
  IF v_winning_pool > 0 AND v_total_winning_amount > 0 THEN
    FOR v_bet IN 
      SELECT * FROM bets 
      WHERE market_id = p_market_id 
      AND side = p_outcome
      AND status = 'ACTIVE'
    LOOP
      -- Payout proportional to amount bet
      v_payout := (v_bet.amount / v_total_winning_amount) * v_pagamento_total_vencedores;

      -- Credit user
      UPDATE users
      SET balance = balance + v_payout
      WHERE id = v_bet.user_id;

      -- Mark bet as won with payout
      UPDATE bets
      SET status = 'WON', potential_payout = v_payout
      WHERE id = v_bet.id;

      -- Log transaction
      INSERT INTO transactions (user_id, type, amount, status, metadata)
      VALUES (
        v_bet.user_id, 
        'WIN', 
        v_payout, 
        'COMPLETED', 
        jsonb_build_object('market_id', p_market_id, 'bet_id', v_bet.id, 'fee_deducted', TRUE)
      );
    END LOOP;
  ELSE
    NULL; 
  END IF;

  -- 5. Mark Losing Bets
  UPDATE bets
  SET status = 'LOST'
  WHERE market_id = p_market_id 
  AND side != p_outcome 
  AND status = 'ACTIVE';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
