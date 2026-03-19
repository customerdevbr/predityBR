import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/auto-market';

/**
 * GET /api/cron/close-markets
 * Invocado pelo Vercel Cron a cada minuto.
 * Fecha mercados manuais expirados (OPEN → PENDING) para validação do admin.
 * Mercados automáticos (BTC, VEHICLE) são resolvidos pelo cron auto-markets.
 */
export async function GET(req: NextRequest) {
    // Valida segredo do cron (Vercel envia automaticamente)
    const authHeader = req.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = getAdminClient();
        const now = new Date().toISOString();

        // Busca mercados manuais expirados (não são automáticos)
        const { data: expiredMarkets, error: fetchError } = await supabase
            .from('markets')
            .select('id, title, end_date')
            .eq('status', 'OPEN')
            .lt('end_date', now)
            .or('metadata->>auto_market.is.null,metadata->>auto_market.eq.false');

        if (fetchError) throw fetchError;

        if (!expiredMarkets || expiredMarkets.length === 0) {
            return NextResponse.json({ closed: 0, message: 'Nenhum mercado para fechar.' });
        }

        // Atualiza status para PENDING
        const ids = expiredMarkets.map((m) => m.id);
        const { error: updateError } = await supabase
            .from('markets')
            .update({ status: 'PENDING' })
            .in('id', ids);

        if (updateError) throw updateError;

        console.log(`[CronCloseMarkets] ${ids.length} mercados fechados para PENDING:`, ids);

        return NextResponse.json({
            closed: ids.length,
            markets: expiredMarkets.map((m) => ({ id: m.id, title: m.title })),
        });
    } catch (err: any) {
        console.error('[CronCloseMarkets] Erro:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
