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

async function probe(token: string, path: string, method = 'GET', body?: any) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, body: json };
}

export async function POST(req: Request) {
    try {
        const { email } = await req.json().catch(() => ({}));

        const token = await xgateLogin();
        const report: Record<string, any> = {};

        // ── 1. Try GET /customers ────────────────────────────────────────────
        report['GET /customers'] = await probe(token, '/customers');

        // ── 2. Try GET /customer ─────────────────────────────────────────────
        report['GET /customer'] = await probe(token, '/customer');

        // ── 3. Try GET /customers?email= ────────────────────────────────────
        if (email) {
            report[`GET /customers?email=${email}`] = await probe(token, `/customers?email=${encodeURIComponent(email)}`);
            report[`GET /customer?email=${email}`] = await probe(token, `/customer?email=${encodeURIComponent(email)}`);
        }

        // ── 4. Try GET /deposit (list of our deposits) ─────────────────────
        report['GET /deposit'] = await probe(token, '/deposit');

        // ── 5. Look up each user's latest xgate_id and try GET /deposit/{id}
        const { data: txRows } = await supabaseAdmin
            .from('transactions')
            .select('user_id, metadata')
            .eq('type', 'DEPOSIT')
            .not('metadata', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20);

        const perDepositResults: any[] = [];
        const seen = new Set<string>();

        for (const tx of txRows || []) {
            const xgateId = tx.metadata?.xgate_id;
            if (!xgateId || seen.has(xgateId)) continue;
            seen.add(xgateId);

            const r1 = await probe(token, `/deposit/${xgateId}`);
            const r2 = await probe(token, `/deposits/${xgateId}`);
            const r3 = await probe(token, `/transaction/${xgateId}`);

            // Try to extract customerId from any of these responses
            const anyBody = r1.ok ? r1.body : r2.ok ? r2.body : r3.body;
            const d = anyBody?.data || anyBody;
            const foundCustomerId =
                d?.customer?._id || d?.customer?.id ||
                d?.customerId || d?.clientId || null;

            perDepositResults.push({
                xgate_charge_id: xgateId,
                user_id: tx.user_id,
                customer_id_found: foundCustomerId,
                'GET /deposit/{id}': r1,
                'GET /deposits/{id}': r2,
                'GET /transaction/{id}': r3,
            });

            await new Promise(r => setTimeout(r, 200));
            if (perDepositResults.length >= 5) break; // limit probing
        }

        report['per_deposit_lookup'] = perDepositResults;

        return NextResponse.json({ token_ok: true, report });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
