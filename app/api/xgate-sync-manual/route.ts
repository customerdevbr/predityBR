import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = "https://api.xgateglobal.com";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // Accept either: explicit xgateCustomerId (already a real _id), or lookup via userId
        const { xgateCustomerId, transactionId, userId, name, email, document, phone } = body;

        let payload: Record<string, string> = {};

        if (userId) {
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('full_name, email, phone, document')
                .eq('id', userId)
                .single();
            if (user) {
                const cpf = (user.document || '').replace(/\D/g, '');
                if (cpf) payload.document = cpf;
                if (user.full_name) payload.name = user.full_name;
                if (user.email) payload.email = user.email;
                if (user.phone) payload.phone = user.phone;
            }
        }
        // Manual overrides
        if (document) payload.document = document.replace(/\D/g, '');
        if (name) payload.name = name;
        if (email) payload.email = email;
        if (phone) payload.phone = phone;

        if (!payload.document) return NextResponse.json({ error: 'CPF (document) obrigatório' }, { status: 400 });

        // Authenticate
        const authRes = await fetch(`${BASE_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: process.env.XGATE_EMAIL, password: process.env.XGATE_PASSWORD }),
        });
        const { token } = await authRes.json();
        if (!token) return NextResponse.json({ error: 'XGate auth failed' }, { status: 500 });

        // Resolve real customer _id
        // If xgateCustomerId was provided, try using it directly first.
        // If that returns 404/400, treat it as a transaction ID and resolve via GET.
        let realCustomerId = xgateCustomerId || transactionId;

        if (realCustomerId) {
            // Always resolve via GET to get the real _id from the response body
            const getRes = await fetch(`${BASE_URL}/customer/${realCustomerId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (getRes.ok) {
                const customerData = await getRes.json();
                // The _id in the response IS the real customer ID for PUT
                realCustomerId = customerData._id || realCustomerId;
            }
        }

        if (!realCustomerId) return NextResponse.json({ error: 'Customer ID não encontrado' }, { status: 400 });

        // PUT with real _id
        const res = await fetch(`${BASE_URL}/customer/${realCustomerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload),
        });
        const resBody = await res.json().catch(() => ({}));

        return NextResponse.json({
            ok: res.ok,
            http_status: res.status,
            real_customer_id: realCustomerId,
            payload_sent: payload,
            xgate_response: resBody,
        });

    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
