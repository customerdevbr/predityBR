-- ═══════════════════════════════════════════════════════════════
-- PredityBR — Migração: Cria função place_bet
-- Execute no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.place_bet(
  p_market_id UUID,
  p_user_id   UUID,
  p_outcome   TEXT,
  p_amount    DECIMAL
) RETURNS VOID AS $$
DECLARE
  v_status       market_status;
  v_pool         DECIMAL;
  v_op           JSONB;
  v_balance      DECIMAL;
  v_outcome_pool DECIMAL;
  v_odds         DECIMAL := 2.0;
BEGIN
  -- 1. Lock market row and validate
  SELECT status, total_pool, outcome_pools
  INTO v_status, v_pool, v_op
  FROM markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Mercado não encontrado';
  END IF;

  IF v_status != 'OPEN' THEN
    RAISE EXCEPTION 'Mercado não está aberto para apostas (status: %)', v_status;
  END IF;

  -- 2. Impede aposta duplicada no mesmo mercado
  IF EXISTS (
    SELECT 1 FROM bets
    WHERE market_id = p_market_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Você já fez um palpite neste mercado';
  END IF;

  -- 3. Lock user row e verifica saldo
  SELECT balance INTO v_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- 4. Estimativa de odds (pari-mutuel — não vinculante, só para odds_at_entry)
  v_outcome_pool := COALESCE((v_op ->> p_outcome)::DECIMAL, 0);
  IF v_outcome_pool > 0 THEN
    v_odds := (v_pool + p_amount) / (v_outcome_pool + p_amount);
    v_odds := GREATEST(1.0, 1.0 + (v_odds - 1.0) * 0.65);
  END IF;

  -- 5. Debita saldo
  UPDATE users SET balance = balance - p_amount WHERE id = p_user_id;

  -- 6. Registra a aposta (side = p_outcome para mercados multi-outcome)
  INSERT INTO bets (market_id, user_id, side, amount, odds_at_entry, potential_payout, status)
  VALUES (p_market_id, p_user_id, p_outcome, p_amount, v_odds, p_amount * v_odds, 'ACTIVE');

  -- 7. Atualiza pools do mercado
  UPDATE markets
  SET
    total_pool    = total_pool + p_amount,
    outcome_pools = jsonb_set(
      COALESCE(outcome_pools, '{}'::jsonb),
      ARRAY[p_outcome],
      to_jsonb(COALESCE((outcome_pools ->> p_outcome)::DECIMAL, 0) + p_amount)
    )
  WHERE id = p_market_id;

  -- 8. Registra transação
  INSERT INTO transactions (user_id, type, amount, status, metadata)
  VALUES (
    p_user_id,
    'BET',
    p_amount,
    'COMPLETED',
    jsonb_build_object('market_id', p_market_id, 'outcome', p_outcome)
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
