import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import {
    getAdminClient,
    createVehicleMarket,
    resolveVehicleMarket,
    getLastFinishedRound,
} from '@/lib/auto-market';

/**
 * POST /api/webhook/vehicle-round
 * Recebe eventos do backend do contador de veículos (contador-de-veiculos/backend/server.js).
 * Protegido por VEHICLE_WEBHOOK_SECRET + HMAC signature.
 *
 * Payload { action: 'start', round_id, target_count }
 * Payload { action: 'end',   round_id, actual_count, rounded_count }
 */

function verifyWebhook(secret: string, signature: string | null, rawBody: string): boolean {
    // Se o backend envia HMAC signature, verificar com timing-safe compare
    if (signature) {
        const expected = createHmac('sha256', process.env.VEHICLE_WEBHOOK_SECRET!)
            .update(rawBody).digest('hex');
        try {
            return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        } catch {
            return false;
        }
    }
    // Fallback: comparação simples de secret (compatibilidade com versão anterior)
    return secret === process.env.VEHICLE_WEBHOOK_SECRET;
}

export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-webhook-secret') ?? '';
    const signature = req.headers.get('x-webhook-signature');

    let rawBody: string;
    try {
        rawBody = await req.text();
    } catch {
        return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    if (!verifyWebhook(secret, signature, rawBody)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Replay protection: rejeita webhooks com timestamp > 5 min
    const ts = req.headers.get('x-webhook-timestamp');
    if (ts && Math.abs(Date.now() - parseInt(ts, 10)) > 5 * 60 * 1000) {
        return NextResponse.json({ error: 'Webhook expirado' }, { status: 401 });
    }

    let body: any;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const { action, round_id, target_count, actual_count, rounded_count, end_time } = body;

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

        const marketId = await createVehicleMarket(round_id, meta, end_time);
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

    if (action === 'void') {
        // Busca o mercado aberto para esta rodada e cancela (reembolso automático via void_market RPC)
        const { data: market } = await supabase
            .from('markets')
            .select('id')
            .eq('metadata->>market_type', 'VEHICLE')
            .eq('metadata->>round_id', round_id)
            .in('status', ['OPEN', 'PENDING'])
            .limit(1)
            .maybeSingle();

        if (!market) {
            return NextResponse.json({ error: 'Mercado não encontrado para cancelar' }, { status: 404 });
        }

        const { error } = await supabase.rpc('void_market', { p_market_id: market.id });
        if (error) {
            console.error('[Webhook] Erro ao cancelar mercado:', error.message);
            return NextResponse.json({ error: 'Falha ao cancelar mercado' }, { status: 500 });
        }

        console.log(`[Webhook] Mercado ${market.id} cancelado (stream_failure) — apostas reembolsadas`);
        return NextResponse.json({ ok: true, action: 'market_voided', market_id: market.id });
    }

    return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
}
