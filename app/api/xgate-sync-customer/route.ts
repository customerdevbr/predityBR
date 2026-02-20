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

        // xgate_id from deposit response IS the Customer ID
        const { data: txRows } = await supabaseAdmin
            .from('transactions')
            .select('metadata')
            .eq('user_id', userId)
            .eq('type', 'DEPOSIT')
            .not('metadata', 'is', null)
            .order('created_at', { ascending: false })
            .limit(10);

        const customerId =
            txRows?.map(tx => tx.metadata?.xgate_customer_id).find(Boolean) ||
            txRows?.map(tx => tx.metadata?.xgate_id).find(id => id && id !== 'unknown_id') ||
            null;

        if (!customerId) {
            return NextResponse.json({
                ok: false,
                skipped: true,
                reason: 'Sem depósitos registrados — ID será capturado no próximo depósito.',
            });
        }

        const authRes = await fetch(`${BASE_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: process.env.XGATE_EMAIL, password: process.env.XGATE_PASSWORD }),
        });
        const { token } = await authRes.json();
        if (!token) throw new Error('XGate auth failed');

        const updatePayload: Record<string, string> = { document: cpf };
        if (user.full_name) updatePayload.name = user.full_name;
        if (user.email) updatePayload.email = user.email;
        if (user.phone) updatePayload.phone = user.phone;

        const res = await fetch(`${BASE_URL}/customer/${customerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updatePayload),
        });
        const resBody = await res.json().catch(() => ({}));

        if (!res.ok && res.status === 400 && resBody.message?.includes('documento')) {
            return NextResponse.json({
                ok: true,
                message: 'CPF já bloqueado na XGate (documento válido registrado anteriormente).',
                xgate_response: resBody,
                payload_sent: updatePayload,
            });
        }

        return NextResponse.json({
            ok: res.ok,
            http_status: res.status,
            customer_id: customerId,
            xgate_response: resBody,
            payload_sent: updatePayload,
        });

    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
