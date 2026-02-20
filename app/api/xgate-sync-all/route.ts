import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = "https://api.xgateglobal.com";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

export async function POST() {
    const results: any[] = [];

    try {
        // ── Step 1: Authenticate with XGate once ────────────────────────────
        let token: string;
        try {
            token = await xgateLogin();
        } catch (e: any) {
            return NextResponse.json({ error: `XGate auth failed: ${e.message}` }, { status: 500 });
        }

        // ── Step 2: Get all users with CPF ──────────────────────────────────
        const { data: users, error: usersErr } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name, phone, document');

        if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });
        if (!users?.length) return NextResponse.json({ message: 'Nenhum usuário encontrado.', results: [] });

        // ── Step 3: For each user, find xgate_customer_id from transactions ──
        for (const user of users) {
            const cpf = (user.document || '').replace(/\D/g, '');
            if (!cpf) {
                results.push({ email: user.email, status: 'skipped', reason: 'sem CPF cadastrado' });
                continue;
            }

            // Look up customer ID from most recent deposit transaction metadata
            const { data: txRows } = await supabaseAdmin
                .from('transactions')
                .select('metadata')
                .eq('user_id', user.id)
                .eq('type', 'DEPOSIT')
                .not('metadata', 'is', null)
                .order('created_at', { ascending: false })
                .limit(10);

            // Find first tx that has an xgate_customer_id in metadata
            const customerId = txRows
                ?.map(tx => tx.metadata?.xgate_customer_id)
                .find(id => !!id);

            if (!customerId) {
                // Also try xgate_id as a fallback reference (it IS the charge ID, not customer ID, but log it)
                const xgateId = txRows?.[0]?.metadata?.xgate_id;
                results.push({
                    email: user.email,
                    status: 'skipped',
                    reason: 'Sem xgate_customer_id nas transações — usuário ainda não fez depósito, ou o ID ainda não foi capturado',
                    xgate_charge_id: xgateId || null,
                    note: xgateId ? '⚠️ Encontramos o charge ID mas não o customer ID. Próximo depósito vai capturá-lo.' : null,
                });
                continue;
            }

            // ── Step 4: Call PUT /customer/{id} ─────────────────────────────
            const payload: Record<string, string> = { document: cpf };
            if (user.full_name) payload.name = user.full_name;
            if (user.email) payload.email = user.email;
            if (user.phone) payload.phone = user.phone;

            try {
                const res = await fetch(`${BASE_URL}/customer/${customerId}`, {
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
                        customerId,
                        status: 'synced',
                        xgate_message: body.message,
                        payload_sent: payload,
                    });
                } else if (res.status === 400) {
                    // "Não é possível alterar o documento de um cliente que já possui um documento válido"
                    results.push({
                        email: user.email,
                        customerId,
                        status: 'locked',
                        http_status: res.status,
                        xgate_message: body.message || JSON.stringify(body),
                        note: '⚠️ CPF está bloqueado na XGate — exclua o customer no painel XGate para resetar.',
                        payload_sent: payload,
                    });
                } else {
                    results.push({
                        email: user.email,
                        customerId,
                        status: 'error',
                        http_status: res.status,
                        xgate_message: body.message || JSON.stringify(body),
                        payload_sent: payload,
                    });
                }
            } catch (e: any) {
                results.push({ email: user.email, customerId, status: 'error', error: e.message });
            }

            // Avoid rate limiting
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
