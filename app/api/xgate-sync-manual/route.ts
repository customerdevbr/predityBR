import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = "https://api.xgateglobal.com";

// Build fix
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const body = await req.json();
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
        if (document) payload.document = document.replace(/\D/g, '');
        if (name) payload.name = name;
        if (email) payload.email = email;
        if (phone) payload.phone = phone;

        if (!payload.document) return NextResponse.json({ error: 'CPF (document) obrigatório' }, { status: 400 });

        // Auth
        const authRes = await fetch(`${BASE_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: process.env.XGATE_EMAIL, password: process.env.XGATE_PASSWORD }),
        });
        const { token } = await authRes.json();
        if (!token) return NextResponse.json({ error: 'XGate auth failed' }, { status: 500 });

        let realCustomerId = xgateCustomerId || transactionId;
        let getStatus: number | null = null;
        let getBody: any = null;

        if (realCustomerId) {
            // GET /customer/{id} to resolve the real _id for PUT
            const getRes = await fetch(`${BASE_URL}/customer/${realCustomerId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            getStatus = getRes.status;
            getBody = await getRes.json().catch(() => null);

            if (getBody && getBody._id) {
                realCustomerId = getBody._id;  // use the real customer _id
            } else if (!getRes.ok) {
                return NextResponse.json({
                    ok: false,
                    error: `GET /customer retornou HTTP ${getRes.status}`,
                    get_status: getStatus,
                    get_body: getBody,
                    input_id: xgateCustomerId || transactionId,
                });
            }
        }

        if (!realCustomerId) return NextResponse.json({ error: 'Customer ID não encontrado' }, { status: 400 });

        // PUT /customer/{realCustomerId}
        const res = await fetch(`${BASE_URL}/customer/${realCustomerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload),
        });
        const resBody = await res.json().catch(() => ({}));

        return NextResponse.json({
            ok: res.ok,
            http_status: res.status,
            // Debug info — shows exactly what happened
            input_id: xgateCustomerId || transactionId,
            get_status: getStatus,
            get_customer_found: getBody ? {
                _id: getBody._id,
                email: getBody.email,
                name: getBody.name,
                document: getBody.document,
            } : null,
            real_customer_id_used_for_put: realCustomerId,
            payload_sent: payload,
            xgate_response: resBody,
        });

    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
