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

    // ── STEP 3: Show what a deposit payload would look like (DRY RUN — NOT SENT) ──
    // ⚠️ We do NOT actually call /deposit here — that would create real charges.
    const dryRunPayload = {
        _note: "SIMULAÇÃO APENAS — nenhuma cobrança é criada aqui",
        amount: 10,
        currency: brlCurrency,
        customer: {
            name: "<<nome_real_do_usuario>>",
            email: "<<email_real_do_usuario>>",
            document: "<<cpf_real_do_usuario>>",  // NUNCA hardcoded
            phone: "<<telefone_real_do_usuario>>",
        },
    };
    report.steps.dry_run_payload = {
        note: "⚠️ Este payload NÃO é enviado à XGate. É apenas para inspeção visual.",
        payload: dryRunPayload,
    };

    // ── STEP 4: NOT EXECUTED — safe mode ─────────────────────────────────────
    report.steps.deposit_attempt = {
        skipped: true,
        reason: "Desabilitado no modo debug para evitar cobranças reais com CPF placeholder.",
        instruction: "Use o fluxo normal de depósito na wallet para testar com um usuário real.",
    };

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
