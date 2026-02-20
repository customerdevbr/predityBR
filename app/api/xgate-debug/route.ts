import { NextResponse } from 'next/server';

const BASE_URL = "https://api.xgateglobal.com";

export async function GET() {
    const report: Record<string, any> = {
        timestamp: new Date().toISOString(),
        env: {
            XGATE_EMAIL: process.env.XGATE_EMAIL ? `✅ ${process.env.XGATE_EMAIL}` : '❌ NOT SET',
            XGATE_PASSWORD: process.env.XGATE_PASSWORD ? '✅ (set, hidden)' : '❌ NOT SET',
            SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? `✅ ${process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40)}...` : '❌ NOT SET',
        },
        steps: {} as Record<string, any>
    };

    // ── STEP 1: Authenticate ──────────────────────────────────────────────────
    let token: string | null = null;
    try {
        const t0 = Date.now();
        const authRes = await fetch(`${BASE_URL}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: process.env.XGATE_EMAIL,
                password: process.env.XGATE_PASSWORD,
            }),
        });
        const authDuration = Date.now() - t0;
        const authBody = await authRes.json().catch(() => authRes.text());
        token = typeof authBody === 'object' ? authBody.token : null;

        report.steps.auth = {
            status: authRes.status,
            ok: authRes.ok,
            duration_ms: authDuration,
            token_received: !!token,
            response: authBody,
        };
    } catch (e: any) {
        report.steps.auth = { error: e.message };
    }

    if (!token) {
        return NextResponse.json({ ...report, fatal: 'Auth failed — cannot continue' });
    }

    // ── STEP 2: Get currencies ────────────────────────────────────────────────
    let brlCurrency: any = null;
    try {
        const t0 = Date.now();
        const curRes = await fetch(`${BASE_URL}/deposit/company/currencies`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const curDuration = Date.now() - t0;
        const curBody = await curRes.json().catch(() => curRes.text());

        const brl = Array.isArray(curBody)
            ? curBody.find((c: any) => c.name === 'BRL' || c.symbol === 'R$' || c.code === 'BRL')
            : null;
        brlCurrency = brl;

        report.steps.currencies = {
            status: curRes.status,
            ok: curRes.ok,
            duration_ms: curDuration,
            brl_found: !!brl,
            brl_object: brl,
            all_currencies: curBody,
        };
    } catch (e: any) {
        report.steps.currencies = { error: e.message };
    }

    // ── STEP 3: Dry-run deposit payload (do NOT actually send — just show what we'd send) ──
    const dryRunPayload = {
        amount: 10,
        currency: brlCurrency,
        customer: {
            name: 'Test User Predity',
            email: 'debug@predity.com',
            phone: '5511999999999',
            document: '00000000000', // placeholder, real flow uses userData.document
        },
    };
    report.steps.dry_run_payload = dryRunPayload;

    // ── STEP 4: Attempt a REAL dry-run (small amount) to see the actual response ──
    try {
        const t0 = Date.now();
        const depRes = await fetch(`${BASE_URL}/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(dryRunPayload),
        });
        const depDuration = Date.now() - t0;
        const depBody = await depRes.json().catch(() => depRes.text());

        // Detect where the QR code lives in the response
        const d = (typeof depBody === 'object' && depBody?.data) ? depBody.data : depBody;
        const possibleQrFields = ['code', 'qrCode', 'payload', 'pixKey', 'qrCodeText', 'paymentCode', 'pixCopiaECola', 'emv', 'codigoPix'];
        const qrField = possibleQrFields.find(f => d?.[f]);

        report.steps.deposit_attempt = {
            status: depRes.status,
            ok: depRes.ok,
            duration_ms: depDuration,
            qr_field_found: qrField || '❌ none — check response structure',
            qr_value_preview: qrField ? String(d[qrField]).slice(0, 60) + '...' : null,
            full_response: depBody,
            top_level_keys: typeof depBody === 'object' ? Object.keys(depBody) : [],
            data_keys: typeof d === 'object' ? Object.keys(d) : [],
        };
    } catch (e: any) {
        report.steps.deposit_attempt = { error: e.message };
    }

    return NextResponse.json(report, { status: 200 });
}

// ── Webhook endpoint stub ─────────────────────────────────────────────────────
// Add a POST handler so we can see if XGate calls back our webhook at this URL
export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    console.log('[xgate-debug WEBHOOK]', JSON.stringify(body));
    // Echo back so we know it arrived
    return NextResponse.json({
        received: true,
        timestamp: new Date().toISOString(),
        body,
    });
}
