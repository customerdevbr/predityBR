-- ═══════════════════════════════════════════════════════════════
-- PredityBR — Migração: Mercados Automáticos (Veículos + BTC)
-- Execute no SQL Editor do Supabase (Settings → SQL Editor)
-- ⚠️  ATENÇÃO: rode este arquivo em DOIS passos:
--   PASSO 1 — execute SOMENTE a linha abaixo (seção 0) e clique Run
--   PASSO 2 — execute o restante do arquivo
-- Isso é necessário pois ALTER TYPE ADD VALUE não pode estar na
-- mesma transação que os índices que usam o novo valor.
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 0. PASSO 1: Adiciona PENDING ao ENUM (execute isoladamente!)
-- ────────────────────────────────────────────────────────────────
ALTER TYPE market_status ADD VALUE IF NOT EXISTS 'PENDING';

-- ════ PARE AQUI NO PASSO 1. Depois execute o restante (PASSO 2) ════

-- ────────────────────────────────────────────────────────────────
-- 1. Tabela de rodadas do contador de veículos
-- (Gerada pelo backend contador-de-veiculos, lida pelo PredityBR)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rounds (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    start_time   TIMESTAMPTZ  DEFAULT now(),
    end_time     TIMESTAMPTZ,
    target_count INTEGER,          -- Meta inicial da rodada (padrão: 100)
    actual_count INTEGER DEFAULT 0, -- Contagem real pela IA
    rounded_count INTEGER,         -- Resultado arredondado (ex: 87 → 90)
    status       TEXT         DEFAULT 'active'
                              CHECK (status IN ('active', 'finished', 'standby')),
    created_at   TIMESTAMPTZ  DEFAULT now()
);

-- Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_rounds_status
    ON public.rounds(status);

CREATE INDEX IF NOT EXISTS idx_rounds_created_at
    ON public.rounds(created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 2. Habilitar Realtime para atualizações ao vivo no frontend
-- ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;

-- ────────────────────────────────────────────────────────────────
-- 3. Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

-- Leitura pública (frontend pode ver as rodadas ao vivo)
CREATE POLICY "rounds_public_read"
    ON public.rounds FOR SELECT
    USING (true);

-- Escrita somente com service_role (backend do contador + PredityBR cron)
CREATE POLICY "rounds_service_insert"
    ON public.rounds FOR INSERT
    WITH CHECK (true);

CREATE POLICY "rounds_service_update"
    ON public.rounds FOR UPDATE
    USING (true);

-- ────────────────────────────────────────────────────────────────
-- 4. Índice na tabela markets para buscas rápidas por market_type
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_markets_market_type
    ON public.markets ((metadata->>'market_type'));

CREATE INDEX IF NOT EXISTS idx_markets_auto
    ON public.markets ((metadata->>'auto_market'))
    WHERE status IN ('OPEN', 'PENDING');

CREATE INDEX IF NOT EXISTS idx_markets_round_id
    ON public.markets ((metadata->>'round_id'))
    WHERE metadata->>'round_id' IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- 5. (PENDING já adicionado na seção 0 acima)
-- ────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────
-- 6. Sessões do BTC Monitor (opcional, para histórico de candles)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.btc_sessions (
    id         UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
    date       DATE  NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.btc_candles (
    id         UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID             NOT NULL REFERENCES btc_sessions(id) ON DELETE CASCADE,
    open       DOUBLE PRECISION NOT NULL,
    close      DOUBLE PRECISION NOT NULL,
    high       DOUBLE PRECISION NOT NULL,
    low        DOUBLE PRECISION NOT NULL,
    timestamp  TIMESTAMPTZ      NOT NULL,
    created_at TIMESTAMPTZ      DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_btc_candles_session_id ON public.btc_candles(session_id);
CREATE INDEX IF NOT EXISTS idx_btc_candles_timestamp  ON public.btc_candles(timestamp);
CREATE INDEX IF NOT EXISTS idx_btc_sessions_date      ON public.btc_sessions(date);

ALTER TABLE public.btc_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btc_candles  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "btc_sessions_public_read" ON public.btc_sessions FOR SELECT USING (true);
CREATE POLICY "btc_candles_public_read"  ON public.btc_candles  FOR SELECT USING (true);
CREATE POLICY "btc_sessions_insert"      ON public.btc_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "btc_candles_insert"       ON public.btc_candles  FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.btc_candles;

-- ════════════════════════════════════════════════════════════════
-- Pronto! Configure também as variáveis de ambiente:
--
--   CRON_SECRET=gere_uma_string_aleatoria_forte
--   VEHICLE_WEBHOOK_SECRET=outro_segredo_para_o_backend
--
-- No backend do contador-de-veiculos, configure:
--   SUPABASE_URL=https://xyniubvihpgoolkpisvy.supabase.co
--   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
--   PREDITY_API_URL=https://preditybr.com
--   PREDITY_WEBHOOK_SECRET=mesmo_valor_de_VEHICLE_WEBHOOK_SECRET
-- ════════════════════════════════════════════════════════════════
