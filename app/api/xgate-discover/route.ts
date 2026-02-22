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

async function probe(token: string, path: string, method = 'GET', body?: any) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, body: json };
}

// Build fix
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const token = await xgateLogin();
        const report: Record<string, any> = {};

        // ── 1. Endpoint scan ────────────────────────────────────────────────
        for (const path of ['/customers', '/customer', '/deposit', '/deposits']) {
            report[`GET ${path}`] = await probe(token, path);
            await new Promise(r => setTimeout(r, 150));
        }

        // ── 2. For each stored transaction ID: try GET /customer/{id} ───────
        // The theory: POST /deposit response body has the customer _id somewhere;
        // we try each stored xgate_id as if it were a customer ID to see if any hit.
        const { data: txRows } = await supabaseAdmin
            .from('transactions')
            .select('user_id, metadata, created_at')
            .eq('type', 'DEPOSIT')
            .not('metadata', 'is', null)
            .order('created_at', { ascending: false })
            .limit(15);

        const customerLookupResults: any[] = [];
        const seenIds = new Set<string>();

        for (const tx of txRows || []) {
            const xgateId = tx.metadata?.xgate_id;
            if (!xgateId || seenIds.has(xgateId) || xgateId === 'unknown_id') continue;
            seenIds.add(xgateId);

            // Try GET /customer/{transaction_id} — maybe the ID IS shared
            const r = await probe(token, `/customer/${xgateId}`);
            const customerData = r.body;

            // Also extract any nested IDs from the stored metadata
            const metaCustomerId =
                tx.metadata?.xgate_customer_id ||
                tx.metadata?.customer_id ||
                tx.metadata?.customerId ||
                null;

            customerLookupResults.push({
                xgate_transaction_id: xgateId,
                try_as_customer_id: {
                    'GET /customer/{id}': { status: r.status, ok: r.ok },
                    customer_data: r.ok ? customerData : null,
                    customer_id_in_response: customerData?._id || null,
                    document_in_response: customerData?.document || null,
                    name_in_response: customerData?.name || null,
                },
                metadata_customer_id: metaCustomerId,
                note: r.ok
                    ? '✅ Funcionou! Este transaction ID é também o Customer ID'
                    : r.status === 404
                        ? '❌ 404 — IDs são diferentes (transaction ≠ customer)'
                        : `⚠️ HTTP ${r.status}`,
            });

            await new Promise(r => setTimeout(r, 300));
            if (customerLookupResults.length >= 6) break;
        }

        report['customer_lookup_by_transaction_id'] = customerLookupResults;

        // ── 3. Summary ──────────────────────────────────────────────────────
        const anyFound = customerLookupResults.some(r =>
            r.try_as_customer_id['GET /customer/{id}'].ok
        );

        return NextResponse.json({
            token_ok: true,
            summary: anyFound
                ? '✅ transaction_id IS the customer_id — use xgate_id from metadata for PUT /customer/{id}'
                : '❌ transaction_id is NOT the customer_id — need another way to find customer IDs',
            report,
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
