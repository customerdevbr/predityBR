import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = "https://api.xgateglobal.com";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

        const { data: user, error: userErr } = await supabaseAdmin
            .from('users')
            .select('id, full_name, email, phone, document')
            .eq('id', userId)
            .single();

        if (userErr || !user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

        const cpf = (user.document || '').replace(/\D/g, '');
        if (!cpf) return NextResponse.json({ error: 'CPF não cadastrado no perfil' }, { status: 400 });

        // Find most recent deposit with an xgate_id
        const { data: txRows } = await supabaseAdmin
            .from('transactions')
            .select('metadata')
            .eq('user_id', userId)
            .eq('type', 'DEPOSIT')
            .not('metadata', 'is', null)
            .order('created_at', { ascending: false })
            .limit(10);

        const transactionId = txRows
            ?.map(tx => tx.metadata?.xgate_id)
            .find(id => id && id !== 'unknown_id');

        if (!transactionId) {
            return NextResponse.json({ ok: false, skipped: true, reason: 'Sem depósitos registrados.' });
        }

        // Auth
        const authRes = await fetch(`${BASE_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: process.env.XGATE_EMAIL, password: process.env.XGATE_PASSWORD }),
        });
        const { token } = await authRes.json();
        if (!token) throw new Error('XGate auth failed');

        // Step 1: GET /customer/{transactionId} → extract real _id
        const getRes = await fetch(`${BASE_URL}/customer/${transactionId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!getRes.ok) {
            return NextResponse.json({ ok: false, error: `GET /customer/${transactionId} retornou ${getRes.status}` });
        }
        const customerData = await getRes.json();
        const realCustomerId = customerData._id;

        if (!realCustomerId) {
            return NextResponse.json({ ok: false, error: 'GET /customer não retornou _id no body' });
        }

        // Step 2: PUT /customer/{realCustomerId}
        const updatePayload: Record<string, string> = { document: cpf };
        if (user.full_name) updatePayload.name = user.full_name;
        if (user.email) updatePayload.email = user.email;
        if (user.phone) updatePayload.phone = user.phone;

        const res = await fetch(`${BASE_URL}/customer/${realCustomerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updatePayload),
        });
        const resBody = await res.json().catch(() => ({}));

        if (!res.ok && res.status === 400 && resBody.message?.includes('documento')) {
            return NextResponse.json({
                ok: true,
                message: 'CPF já bloqueado na XGate.',
                real_customer_id: realCustomerId,
                xgate_response: resBody,
                payload_sent: updatePayload,
            });
        }

        return NextResponse.json({
            ok: res.ok,
            http_status: res.status,
            real_customer_id: realCustomerId,
            xgate_response: resBody,
            payload_sent: updatePayload,
        });

    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
