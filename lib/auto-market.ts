/**
 * lib/auto-market.ts
 * Utilitários para criação e resolução automática de mercados (BTC + Veículos)
 */

import { createClient } from '@supabase/supabase-js';

// Cliente com service role para operações privilegiadas
export function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// ─── Horário de Brasília ─────────────────────────────────────────────────────

/** Retorna a hora atual no horário de Brasília (UTC-3) */
export function getBRTHour(): number {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    const brt = new Date(utcMs - 3 * 60 * 60_000);
    return brt.getHours();
}

/** Retorna os minutos atuais (BRT) */
export function getBRTMinutes(): number {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    const brt = new Date(utcMs - 3 * 60 * 60_000);
    return brt.getMinutes();
}

/** Verdadeiro entre 09:00 e 19:59 BRT */
export function isOperatingHours(): boolean {
    const h = getBRTHour();
    return h >= 9 && h < 20;
}

/** Verdadeiro no início de cada janela de 5 minutos (:00, :05, :10...) */
export function isAtFiveMinBoundary(): boolean {
    return getBRTMinutes() % 5 === 0;
}

// ─── BTC ────────────────────────────────────────────────────────────────────

/** Busca o preço atual do BTC/USDT na Binance */
export async function getBTCPrice(): Promise<number> {
    const res = await fetch(
        'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
        { cache: 'no-store' }
    );
    if (!res.ok) throw new Error('Falha ao obter preço BTC');
    const json = await res.json();
    return parseFloat(json.price);
}

/** Cria um mercado BTC com o preço de abertura */
export async function createBTCMarket(openPrice: number): Promise<string | null> {
    const supabase = getAdminClient();

    const now = new Date();
    const endDate = new Date(now.getTime() + 5 * 60_000); // +5 min

    const formattedPrice = openPrice.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    const title = `₿ BTC vai ultrapassar $${formattedPrice} nos próximos 5 minutos?`;
    const description =
        `Preço de abertura: $${formattedPrice} USD\n\n` +
        `📋 Regras do mercado:\n` +
        `• O resultado é determinado pelo preço real do BTC/USDT na Binance ao final dos 5 minutos.\n` +
        `• SUBIU: preço de fechamento ACIMA do valor de abertura ($${formattedPrice}).\n` +
        `• CAIU: preço de fechamento IGUAL OU ABAIXO do valor de abertura.\n` +
        `• Dados em tempo real via WebSocket da Binance. Horário: 09h–20h BRT.\n` +
        `• Este mercado encerra e se resolve automaticamente ao final do período.`;

    const { data, error } = await supabase
        .from('markets')
        .insert({
            title,
            description,
            category: 'CRIPTO',
            status: 'OPEN',
            end_date: endDate.toISOString(),
            outcomes: ['SUBIU', 'CAIU'],
            total_pool: 0,
            total_yes_amount: 0,
            total_no_amount: 0,
            outcome_pools: { SUBIU: 0, CAIU: 0 },
            metadata: {
                market_type: 'BTC',
                auto_market: true,
                btc_open_price: openPrice,
                btc_window_start: now.toISOString(),
            },
        })
        .select('id')
        .single();

    if (error) {
        console.error('[AutoMarket] Erro ao criar mercado BTC:', error.message);
        return null;
    }

    console.log(`[AutoMarket] Mercado BTC criado: ${data.id} | Abertura: $${formattedPrice}`);
    return data.id;
}

/** Resolve um mercado BTC comparando preços */
export async function resolveBTCMarket(
    marketId: string,
    openPrice: number,
    closePrice: number
): Promise<boolean> {
    const outcome = closePrice > openPrice ? 'SUBIU' : 'CAIU';

    const supabase = getAdminClient();

    // Atualiza prova antes de resolver
    await supabase
        .from('markets')
        .update({
            metadata: {
                market_type: 'BTC',
                auto_market: true,
                btc_open_price: openPrice,
                btc_close_price: closePrice,
                resolution_proof: {
                    text: `Preço de fechamento: $${closePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Abertura: $${openPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Resultado: ${outcome}`,
                },
            },
        })
        .eq('id', marketId);

    const { error } = await supabase.rpc('resolve_market', {
        p_market_id: marketId,
        p_outcome: outcome,
    });

    if (error) {
        console.error('[AutoMarket] Erro ao resolver mercado BTC:', error.message);
        return false;
    }

    console.log(`[AutoMarket] Mercado BTC ${marketId} resolvido: ${outcome} | Close: $${closePrice}`);
    return true;
}

// ─── Veículos ────────────────────────────────────────────────────────────────

/** Retorna a rodada ativa do contador de veículos */
export async function getActiveVehicleRound() {
    const supabase = getAdminClient();
    const { data } = await supabase
        .from('rounds')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return data;
}

/** Retorna a última rodada finalizada */
export async function getLastFinishedRound() {
    const supabase = getAdminClient();
    const { data } = await supabase
        .from('rounds')
        .select('*')
        .eq('status', 'finished')
        .order('end_time', { ascending: false })
        .limit(1)
        .maybeSingle();
    return data;
}

/** Cria um mercado de contagem de veículos */
export async function createVehicleMarket(
    roundId: string,
    targetCount: number
): Promise<string | null> {
    const supabase = getAdminClient();

    const now = new Date();
    const endDate = new Date(now.getTime() + 5 * 60_000);

    const title = `🚗 Câmera Ao Vivo: Vão passar MAIS de ${targetCount} veículos nesta rodada?`;
    const description =
        `Meta desta rodada: ${targetCount} veículos\n\n` +
        `📋 Regras do mercado:\n` +
        `• A contagem é feita por uma IA (YOLOv8) monitorando câmera de tráfego pública da rodovia SP-055 (Km 110A).\n` +
        `• MAIS: total de veículos contabilizados pela IA SUPERIOR a ${targetCount}.\n` +
        `• MENOS: total IGUAL OU INFERIOR a ${targetCount}.\n` +
        `• ⚠️ Transparência: devido à qualidade da transmissão ao vivo e ao desempenho da IA, alguns veículos podem não ser contabilizados. Vale exclusivamente o número computado pelo sistema.\n` +
        `• A meta da próxima rodada é definida com base no resultado arredondado desta (ex: 87 → próxima meta: 90).\n` +
        `• Horário de funcionamento: 09h–20h BRT, todos os dias.`;

    const { data, error } = await supabase
        .from('markets')
        .insert({
            title,
            description,
            category: 'VEÍCULOS',
            status: 'OPEN',
            end_date: endDate.toISOString(),
            outcomes: ['MAIS', 'MENOS'],
            total_pool: 0,
            total_yes_amount: 0,
            total_no_amount: 0,
            outcome_pools: { MAIS: 0, MENOS: 0 },
            metadata: {
                market_type: 'VEHICLE',
                auto_market: true,
                round_id: roundId,
                target_count: targetCount,
                stream_url: 'https://34.104.32.249.nip.io/SP055-KM110A/stream.m3u8',
            },
        })
        .select('id')
        .single();

    if (error) {
        console.error('[AutoMarket] Erro ao criar mercado Veículos:', error.message);
        return null;
    }

    console.log(`[AutoMarket] Mercado Veículos criado: ${data.id} | Rodada: ${roundId} | Meta: ${targetCount}`);
    return data.id;
}

/** Resolve um mercado de veículos com base no resultado real da rodada */
export async function resolveVehicleMarket(
    marketId: string,
    targetCount: number,
    actualCount: number,
    roundedCount: number
): Promise<boolean> {
    const outcome = actualCount > targetCount ? 'MAIS' : 'MENOS';
    const supabase = getAdminClient();

    await supabase
        .from('markets')
        .update({
            metadata: {
                market_type: 'VEHICLE',
                auto_market: true,
                actual_count: actualCount,
                rounded_count: roundedCount,
                target_count: targetCount,
                resolution_proof: {
                    text: `IA contabilizou ${actualCount} veículos. Meta era ${targetCount}. Resultado arredondado: ${roundedCount}. Próxima meta: ${roundedCount}.`,
                },
            },
        })
        .eq('id', marketId);

    const { error } = await supabase.rpc('resolve_market', {
        p_market_id: marketId,
        p_outcome: outcome,
    });

    if (error) {
        console.error('[AutoMarket] Erro ao resolver mercado Veículos:', error.message);
        return false;
    }

    console.log(`[AutoMarket] Mercado Veículos ${marketId} resolvido: ${outcome} | Real: ${actualCount}`);
    return true;
}
