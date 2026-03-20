import { NextRequest, NextResponse } from 'next/server';
import {
    getAdminClient,
    isOperatingHours,
    getBTCPrice,
    createBTCMarket,
    resolveBTCMarket,
    getActiveVehicleRound,
    getLastFinishedRound,
    createVehicleMarket,
    resolveVehicleMarket,
} from '@/lib/auto-market';

/**
 * GET /api/cron/auto-markets
 * Invocado pelo Vercel Cron a cada minuto.
 * Gerencia o ciclo completo dos mercados automáticos:
 *   - BTC:     resolve expirado → cria novo (se não houver mercado aberto)
 *   - Veículos: cria mercado ao iniciar rodada → resolve ao finalizar
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminClient();
    const now = new Date().toISOString();
    const results: Record<string, any> = {};

    // ══════════════════════════════════════════════════════════════
    // BTC MARKET — resolve e cria em blocos independentes para que
    // uma falha na resolução não impeça a criação do próximo mercado
    // ══════════════════════════════════════════════════════════════

    // 1. Resolve mercado BTC expirado
    try {
        const { data: expiredBTC } = await supabase
            .from('markets')
            .select('id, metadata')
            .eq('status', 'OPEN')
            .eq('metadata->>market_type', 'BTC')
            .lt('end_date', now)
            .limit(1)
            .maybeSingle();

        if (expiredBTC) {
            const openPrice = expiredBTC.metadata?.btc_open_price as number;
            const currentPrice = await getBTCPrice();
            const resolved = await resolveBTCMarket(expiredBTC.id, openPrice, currentPrice);
            results.btc_resolved = resolved ? expiredBTC.id : 'FAILED';
        }
    } catch (err: any) {
        console.error('[AutoMarkets/BTC/resolve]', err.message);
        results.btc_resolve_error = err.message;
    }

    // 2. Cria novo mercado BTC se não houver nenhum aberto (durante horário de operação)
    // Sem exigir janela de 5 min: se a criação falhou num ciclo, o próximo a corrige.
    try {
        if (isOperatingHours()) {
            const { data: openBTC } = await supabase
                .from('markets')
                .select('id')
                .eq('status', 'OPEN')
                .eq('metadata->>market_type', 'BTC')
                .gte('end_date', now)
                .limit(1)
                .maybeSingle();

            if (!openBTC) {
                const openPrice = await getBTCPrice();
                const marketId = await createBTCMarket(openPrice);
                results.btc_created = marketId ?? 'FAILED';
            } else {
                results.btc_skipped = 'mercado já aberto';
            }
        }
    } catch (err: any) {
        console.error('[AutoMarkets/BTC/create]', err.message);
        results.btc_create_error = err.message;
    }

    // ══════════════════════════════════════════════════════════════
    // VEHICLE COUNTER MARKET
    // ══════════════════════════════════════════════════════════════
    try {
        // 1. Procura mercado de veículos expirado para resolver
        const { data: expiredVehicle } = await supabase
            .from('markets')
            .select('id, metadata')
            .eq('status', 'OPEN')
            .eq('metadata->>market_type', 'VEHICLE')
            .lt('end_date', now)
            .limit(1)
            .maybeSingle();

        if (expiredVehicle) {
            const roundId = expiredVehicle.metadata?.round_id as string;
            const targetCount = expiredVehicle.metadata?.target_count as number;

            // Busca o resultado da rodada no Supabase
            const { data: round } = await supabase
                .from('rounds')
                .select('actual_count, rounded_count, status')
                .eq('id', roundId)
                .maybeSingle();

            if (round && (round.status === 'finished' || round.actual_count !== null)) {
                const actualCount = round.actual_count ?? 0;
                const roundedCount = round.rounded_count ?? Math.ceil(actualCount / 10) * 10;
                const resolved = await resolveVehicleMarket(
                    expiredVehicle.id,
                    targetCount,
                    actualCount,
                    roundedCount
                );
                results.vehicle_resolved = resolved ? expiredVehicle.id : 'FAILED';
            } else {
                // Rodada ainda não terminou: força finalização após timeout
                await supabase
                    .from('markets')
                    .update({ status: 'PENDING' })
                    .eq('id', expiredVehicle.id);
                results.vehicle_pending = expiredVehicle.id;
            }
        }

        // 2. Verifica se há rodada ativa sem mercado correspondente
        if (isOperatingHours()) {
            const activeRound = await getActiveVehicleRound();

            if (activeRound) {
                // Verifica se já existe mercado aberto para esta rodada
                const { data: existingMarket } = await supabase
                    .from('markets')
                    .select('id')
                    .eq('status', 'OPEN')
                    .eq('metadata->>market_type', 'VEHICLE')
                    .eq('metadata->>round_id', activeRound.id)
                    .limit(1)
                    .maybeSingle();

                if (!existingMarket) {
                    // Busca a última rodada finalizada para definir a meta
                    const lastRound = await getLastFinishedRound();
                    const targetCount = lastRound?.rounded_count ?? activeRound.target_count ?? 100;

                    const marketId = await createVehicleMarket(activeRound.id, targetCount);
                    results.vehicle_created = marketId ?? 'FAILED';
                } else {
                    results.vehicle_skipped = 'mercado já aberto para esta rodada';
                }
            }
        }
    } catch (err: any) {
        console.error('[AutoMarkets/Vehicle]', err.message);
        results.vehicle_error = err.message;
    }

    return NextResponse.json({ ok: true, timestamp: now, results });
}
