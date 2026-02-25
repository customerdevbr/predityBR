-- =========================================================================
-- SCRIPT DE RESET DE PRODUÇÃO (WIPE)
-- AVISO: Rode este script APENAS ANTES DO LANÇAMENTO OFICIAL.
-- Ele APAGA permanentemente histórico de saque, depósito e apostas.
-- Mantém apenas:
--   - Os usuários e suas contas (zerados)
--   - Os mercados e suas imagens (zerados)
-- =========================================================================

-- 1. APAGA O HISTÓRICO FINANCEIRO E DE APOSTAS
DELETE FROM bets;
DELETE FROM transactions;

-- 2. ZERA TODOS OS SALDOS DAS CONTAS E MANTEM NIVEL DE ADMIN
UPDATE users 
SET 
  balance = 0;

-- 3. ZERA AS PISCINAS DOS MERCADOS
UPDATE markets 
SET 
  total_pool = 0, 
  total_yes_amount = 0, 
  total_no_amount = 0, 
  outcome_pools = '{}'::jsonb;
  
-- =========================================================================
-- FIM. O BANCO AGORA ESTÁ LIMPO COMO UMA FOLHA EM BRANCO PARA O LANÇAMENTO.
-- =========================================================================
