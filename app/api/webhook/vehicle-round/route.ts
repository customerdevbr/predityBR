import { NextRequest, NextResponse } from 'next/server';
import {
    getAdminClient,
    createVehicleMarket,
    resolveVehicleMarket,
    getLastFinishedRound,
} from '@/lib/auto-market';

/**
 * POST /api/webhook/vehicle-round
 * Recebe eventos do backend do contador de veículos (contador-de-veiculos/backend/server.js).
 * Protegido por VEHICLE_WEBHOOK_SECRET no header X-Webhook-Secret.
 *
 * Payload { action: 'start', round_id, target_count }
 * Payload { action: 'end',   round_id, actual_count, rounded_count }
 */
export async function POST(req: NextRequest) {
    // Valida segredo
    const secret = req.headers.get('x-webhook-secret');
    if (!secret || secret !== process.env.VEHICLE_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const { action, round_id, target_count, actual_count, rounded_count } = body;

    if (!action || !round_id) {
        return NextResponse.json({ error: 'Campos obrigatórios: action, round_id' }, { status: 400 });
    }

    const supabase = getAdminClient();

    if (action === 'start') {
        // Rodada iniciou → cria mercado correspondente
        // Usa a meta passada ou a da última rodada finalizada
        let meta = target_count;
        if (!meta) {
            const lastRound = await getLastFinishedRound();
            meta = lastRound?.rounded_count ?? 100;
        }

        const marketId = await createVehicleMarket(round_id, meta);
        if (!marketId) {
            return NextResponse.json({ error: 'Falha ao criar mercado' }, { status: 500 });
        }

        return NextResponse.json({ ok: true, action: 'market_created', market_id: marketId });
    }

    if (action === 'end') {
        if (actual_count === undefined || actual_count === null) {
            return NextResponse.json({ error: 'actual_count obrigatório para action=end' }, { status: 400 });
        }

        // Busca o mercado aberto para esta rodada
        const { data: market } = await supabase
            .from('markets')
            .select('id, metadata')
            .eq('metadata->>market_type', 'VEHICLE')
            .eq('metadata->>round_id', round_id)
            .in('status', ['OPEN', 'PENDING'])
            .limit(1)
            .maybeSingle();

        if (!market) {
            return NextResponse.json({ error: 'Mercado não encontrado para esta rodada' }, { status: 404 });
        }

        const finalRounded = rounded_count ?? Math.ceil(actual_count / 10) * 10;
        const resolved = await resolveVehicleMarket(
            market.id,
            market.metadata?.target_count ?? 100,
            actual_count,
            finalRounded
        );

        if (!resolved) {
            return NextResponse.json({ error: 'Falha ao resolver mercado' }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            action: 'market_resolved',
            market_id: market.id,
            outcome: actual_count > (market.metadata?.target_count ?? 100) ? 'MAIS' : 'MENOS',
            actual_count,
            rounded_count: finalRounded,
        });
    }

    return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
}
