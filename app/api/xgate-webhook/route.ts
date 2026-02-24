import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// XGate sends various status names depending on their API version

// XGate sends various status names depending on their API version
const PAID_STATUSES = [
    'paid', 'PAID',
    'completed', 'COMPLETED',
    'approved', 'APPROVED',
    'success', 'SUCCESS',
    'confirmed', 'CONFIRMED',
    'active', 'ACTIVE',
    'settled', 'SETTLED',
    'done', 'DONE',
    'finished', 'FINISHED',
];

// Build fix
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let rawBody = '';
    try {
        rawBody = await req.text();
        const body: any = JSON.parse(rawBody);

        // ── EXHAUSTIVE DEBUG LOGGING ──
        console.log('[xgate-webhook] ====== INCOMING WEBHOOK ======');
        console.log('[xgate-webhook] Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
        console.log('[xgate-webhook] Raw Body:', rawBody.slice(0, 2000));
        console.log('[xgate-webhook] Parsed Body:', JSON.stringify(body, null, 2));

        // ── Extract the XGate transaction ID from the webhook ──
        const xgateId =
            body?.data?.id ||
            body?.data?.transaction_id ||
            body?.data?.orderId ||
            body?.data?._id ||
            body?.id ||
            body?.transaction_id ||
            body?.orderId ||
            body?.transactionId ||
            body?.pixTransactionId ||
            null;

        // ── Extract payment status ──
        const status =
            body?.data?.status ||
            body?.status ||
            body?.event ||
            null;

        const isPaid = PAID_STATUSES.includes(String(status));

        console.log(`[xgate-webhook] Extracted: xgateId=${xgateId} status=${status} isPaid=${isPaid}`);
        console.log(`[xgate-webhook] All body keys: ${Object.keys(body).join(', ')}`);
        if (body?.data) console.log(`[xgate-webhook] body.data keys: ${Object.keys(body.data).join(', ')}`);

        if (!xgateId) {
            console.error('[xgate-webhook] FAILED: Could not extract xgate ID from any known field');
            return NextResponse.json({
                ok: false,
                error: 'Could not extract xgate transaction ID from payload',
                received: body,
            }, { status: 200 });
        }

        if (!isPaid) {
            // Acknowledge but don't credit — may be a pending/failed notification
            return NextResponse.json({
                ok: true,
                message: `Status "${status}" does not trigger credit. No action taken.`,
                xgateId,
            });
        }

        // ── Find our transaction by xgate_id in metadata ──
        const { data: txRows, error: findErr } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('type', 'DEPOSIT')
            .eq('status', 'PENDING')
            .filter('metadata->>xgate_id', 'eq', xgateId)
            .limit(1);

        if (findErr) {
            console.error('[xgate-webhook] DB find error:', findErr);
            return NextResponse.json({ ok: false, error: findErr.message }, { status: 200 });
        }

        if (!txRows || txRows.length === 0) {
            // Debug: list all PENDING deposits to compare IDs
            const { data: allPending } = await supabaseAdmin
                .from('transactions')
                .select('id, metadata, created_at')
                .eq('type', 'DEPOSIT')
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false })
                .limit(5);

            console.warn('[xgate-webhook] No PENDING transaction found for xgateId:', xgateId);
            console.warn('[xgate-webhook] Recent PENDING deposits for comparison:', JSON.stringify(allPending?.map(t => ({ id: t.id, xgate_id: t.metadata?.xgate_id }))));

            return NextResponse.json({
                ok: true,
                message: `No pending transaction found for xgate_id="${xgateId}". Already processed or ID mismatch.`,
                debug_pending_ids: allPending?.map(t => t.metadata?.xgate_id)
            });
        }

        const tx = txRows[0];
        const { user_id, amount } = tx;

        // ── Mark transaction as COMPLETED ──
        const { error: updateErr } = await supabaseAdmin
            .from('transactions')
            .update({
                status: 'COMPLETED',
                metadata: { ...tx.metadata, webhook_received_at: new Date().toISOString(), webhook_status: status }
            })
            .eq('id', tx.id);

        if (updateErr) {
            console.error('[xgate-webhook] Could not update transaction:', updateErr);
            return NextResponse.json({ ok: false, error: updateErr.message }, { status: 200 });
        }

        // ── Credit user balance ──
        const { error: rpcErr } = await supabaseAdmin.rpc('increment_balance', {
            userid: user_id,
            amount: amount
        });

        if (rpcErr) {
            // Fallback: direct update
            console.warn('[xgate-webhook] increment_balance RPC failed, falling back to direct update:', rpcErr);
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('balance')
                .eq('id', user_id)
                .single();

            if (userRow) {
                await supabaseAdmin
                    .from('users')
                    .update({ balance: (userRow.balance || 0) + amount })
                    .eq('id', user_id);
            }
        }

        console.log(`[xgate-webhook] ✅ Credited R$${amount} to user ${user_id} for xgate_id=${xgateId}`);

        return NextResponse.json({
            ok: true,
            credited: true,
            user_id,
            amount,
            transaction_id: tx.id,
            xgate_id: xgateId,
        });

    } catch (err: any) {
        console.error('[xgate-webhook] Unhandled error:', err.message, 'raw:', rawBody.slice(0, 500));
        return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
        // Always return 200 — returning 500 causes XGate to retry and double-credit
    }
}

// Allow XGate to probe the endpoint
export async function GET() {
    return NextResponse.json({ ok: true, endpoint: 'xgate-webhook', ts: new Date().toISOString() });
}
