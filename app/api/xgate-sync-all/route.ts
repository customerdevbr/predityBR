import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = "https://api.xgateglobal.com";

async function xgateLogin(): Promise<string> {
    const res = await fetch(`${BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: process.env.XGATE_EMAIL, password: process.env.XGATE_PASSWORD }),
    });
    const data = await res.json();
    if (!data.token) throw new Error(`XGate auth failed: ${JSON.stringify(data)}`);
    return data.token;
}

/**
 * Given a transaction ID (xgate_id from our DB), finds the real XGate customer _id
 * by calling GET /customer/{transactionId} and extracting the _id field from the response.
 */
async function resolveCustomerId(token: string, transactionId: string): Promise<string | null> {
    const res = await fetch(`${BASE_URL}/customer/${transactionId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data._id || null;
}

// Build fix
export const dynamic = 'force-dynamic';

export async function POST() {
    const results: any[] = [];

    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const token = await xgateLogin();

        const { data: users, error: usersErr } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name, phone, document');

        if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });
        if (!users?.length) return NextResponse.json({ message: 'Nenhum usuário encontrado.', results: [] });

        for (const user of users) {
            const cpf = (user.document || '').replace(/\D/g, '');
            if (!cpf) {
                results.push({ email: user.email, status: 'skipped', reason: 'sem CPF cadastrado no perfil' });
                continue;
            }

            // Get most recent deposit transaction with an xgate_id
            const { data: txRows } = await supabaseAdmin
                .from('transactions')
                .select('metadata')
                .eq('user_id', user.id)
                .eq('type', 'DEPOSIT')
                .not('metadata', 'is', null)
                .order('created_at', { ascending: false })
                .limit(10);

            const transactionId = txRows
                ?.map(tx => tx.metadata?.xgate_id)
                .find(id => id && id !== 'unknown_id');

            if (!transactionId) {
                results.push({ email: user.email, status: 'skipped', reason: 'Sem transações de depósito registradas' });
                continue;
            }

            // Step 1: GET /customer/{transactionId} → extract real _id
            const realCustomerId = await resolveCustomerId(token, transactionId);
            if (!realCustomerId) {
                results.push({
                    email: user.email,
                    transaction_id: transactionId,
                    status: 'skipped',
                    reason: 'Não foi possível obter o _id real do customer via GET /customer/{transactionId}',
                });
                continue;
            }

            // Step 2: PUT /customer/{realCustomerId}
            const payload: Record<string, string> = { document: cpf };
            if (user.full_name) payload.name = user.full_name;
            if (user.email) payload.email = user.email;
            if (user.phone) payload.phone = user.phone;

            const res = await fetch(`${BASE_URL}/customer/${realCustomerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const body = await res.json().catch(() => ({}));

            if (res.ok) {
                results.push({
                    email: user.email,
                    transaction_id: transactionId,
                    real_customer_id: realCustomerId,
                    status: 'synced',
                    xgate_message: body.message,
                    payload_sent: payload,
                });
            } else if (res.status === 400) {
                results.push({
                    email: user.email,
                    transaction_id: transactionId,
                    real_customer_id: realCustomerId,
                    status: 'locked',
                    http_status: res.status,
                    xgate_message: body.message || JSON.stringify(body),
                    note: 'CPF bloqueado na XGate — contate o suporte XGate.',
                    payload_sent: payload,
                });
            } else {
                results.push({
                    email: user.email,
                    transaction_id: transactionId,
                    real_customer_id: realCustomerId,
                    status: 'error',
                    http_status: res.status,
                    xgate_message: body.message || JSON.stringify(body),
                    payload_sent: payload,
                });
            }

            await new Promise(r => setTimeout(r, 300));
        }

        const synced = results.filter(r => r.status === 'synced').length;
        const locked = results.filter(r => r.status === 'locked').length;
        const errors = results.filter(r => r.status === 'error').length;
        const skipped = results.filter(r => r.status === 'skipped').length;

        return NextResponse.json({ total: users.length, synced, locked, errors, skipped, results });

    } catch (err: any) {
        return NextResponse.json({ error: err.message, results }, { status: 500 });
    }
}
