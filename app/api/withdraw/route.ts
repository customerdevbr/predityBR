import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BASE_URL = "https://api.xgateglobal.com";

async function xgateLogin() {
    const email = process.env.XGATE_EMAIL;
    const password = process.env.XGATE_PASSWORD;
    if (!email || !password) throw new Error("XGATE_EMAIL or XGATE_PASSWORD not configured");

    const res = await fetch(`${BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`XGate auth failed: ${err.message || res.statusText}`);
    }
    const data = await res.json();
    return data.token as string;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, userId, pixKey, pixKeyType } = body;

        console.log(`[withdraw] Received request. User: ${userId}, Amount: ${amount}, Key: ${pixKey}, Type: ${pixKeyType}`);

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; },
                    set() { },
                    remove() { },
                }
            }
        );

        // ── 1. Fetch & validate user ────────────────────────────────────────────
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        // --- Standard Withdrawal Validation ---
        if ((!amount || amount < 20) && userData.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Valor mínimo de saque: R$ 20,00' }, { status: 400 });
        }
        if (!pixKey) {
            return NextResponse.json({ error: 'Chave PIX obrigatória' }, { status: 400 });
        }

        // Sanitize PIX key
        let sanitizedPixKey = pixKey.trim();
        const digitsOnly = pixKey.replace(/\D/g, '');

        if (pixKeyType === 'CPF' || (!pixKeyType && digitsOnly.length === 11)) {
            if (digitsOnly.length !== 11) {
                return NextResponse.json({ error: `O CPF da chave PIX deve conter exatamente 11 dígitos. Você enviou ${digitsOnly.length} dígitos.` }, { status: 400 });
            }
            sanitizedPixKey = digitsOnly;
        } else if (pixKeyType === 'PHONE') {
            sanitizedPixKey = digitsOnly;
        }

        if (!userData.document || userData.document.trim() === '') {
            return NextResponse.json({
                error: 'CPF obrigatório: Adicione seu CPF no Perfil antes de sacar.'
            }, { status: 400 });
        }

        const userCpfClean = userData.document.replace(/\D/g, '');
        if (userCpfClean.length !== 11) {
            return NextResponse.json({
                error: `O CPF no seu perfil está inválido (${userCpfClean.length} dígitos). Por favor, corrija no seu Perfil.`
            }, { status: 400 });
        }

        const FEE = 2.90;
        const totalDeduction = amount;
        const netAmount = amount - FEE;

        if ((userData.balance || 0) < totalDeduction) {
            return NextResponse.json({
                error: `Saldo insuficiente. Você tem R$ ${(userData.balance || 0).toFixed(2)}`
            }, { status: 400 });
        }

        // ── 2. XGate: Login ───────────────────────────────────────────────────
        const token = await xgateLogin();

        // ── 3. XGate: Get or Create Customer ID ──────────────────────────────
        let customerId = userData.xgate_customer_id;

        if (!customerId) {
            console.log(`[withdraw] customerId missing for user ${userId}, creating in XGate...`);
            const customerPayload = {
                name: userData.full_name || 'Cliente Predity',
                email: userData.email,
                document: userCpfClean,
                phone: userData.phone?.replace(/\D/g, ''),
            };

            const createRes = await fetch(`${BASE_URL}/customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(customerPayload),
            });

            const createData = await createRes.json().catch(() => ({}));
            console.log('[withdraw] Customer Create Response:', createData);

            if (createRes.ok) {
                customerId = createData._id || createData.id;
            } else {
                // Try to find customer by document if creation fails due to duplicate
                console.log(`[withdraw] Customer creation failed (code ${createRes.status}), attempting lookup by document ${userCpfClean}`);
                const listRes = await fetch(`${BASE_URL}/customers?limit=1&document=${userCpfClean}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const listData = await listRes.json().catch(() => []);
                const found = Array.isArray(listData) ? listData[0] : (listData.data ? listData.data[0] : null);
                if (found) {
                    customerId = found._id || found.id;
                    console.log(`[withdraw] Found existing customer: ${customerId}`);
                }
            }

            if (!customerId) {
                return NextResponse.json({ error: `Falha ao identificar cliente na XGate: ${JSON.stringify(createData)}` }, { status: 500 });
            }

            // Save back to DB
            await supabase.from('users').update({ xgate_customer_id: customerId } as any).eq('id', userId);
        }

        // ── 4. XGate: Ensure PIX Key is registered for this Customer ──────────
        console.log(`[withdraw] Checking PIX keys for customer ${customerId}`);
        const keysRes = await fetch(`${BASE_URL}/pix/customer/${customerId}/key`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const keysData = await keysRes.json().catch(() => ({}));
        const existingKeys = Array.isArray(keysData) ? keysData : (keysData.data || []);

        // Match by string value (both sanitized)
        let xgatePixKeyObj = existingKeys.find((k: any) => {
            const kVal = (k.key || k.pixKey || '').replace(/\D/g, '');
            const targetVal = sanitizedPixKey.replace(/\D/g, '');
            // If it's numbers only, compare digits. If it's an email/random, compare string.
            if (targetVal.length > 0 && kVal === targetVal) return true;
            return (k.key === sanitizedPixKey || k.pixKey === sanitizedPixKey);
        });

        if (!xgatePixKeyObj) {
            console.log(`[withdraw] PIX key "${sanitizedPixKey}" not found in XGate, registering as ${pixKeyType || 'CPF'}...`);
            const registRes = await fetch(`${BASE_URL}/pix/customer/${customerId}/key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    key: sanitizedPixKey,
                    type: pixKeyType || 'CPF'
                }),
            });
            const registData = await registRes.json().catch(() => ({}));
            console.log('[withdraw] PIX Key Registration Response:', registData);

            if (!registRes.ok) {
                const errMsg = registData.message || JSON.stringify(registData);
                return NextResponse.json({ error: `Falha ao registrar chave PIX: ${errMsg}` }, { status: 500 });
            }
            xgatePixKeyObj = registData.key || registData.data || registData;
        }

        // ── 5. XGate: Get Currencies ──────────────────────────────────────────
        const curRes = await fetch(`${BASE_URL}/withdraw/company/currencies`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const currenciesData = await curRes.json();
        const currencies = Array.isArray(currenciesData) ? currenciesData : (currenciesData.data || []);

        const brl = currencies.find((c: any) => c.name === 'BRL' || c.symbol === 'BRL') || currencies[0];

        if (!brl) throw new Error('BRL currency not found for withdrawal');

        // ── 6. XGate: Submit Withdrawal ───────────────────────────────────────
        const withdrawPayload = {
            amount: netAmount,
            customerId,
            currency: brl,
            pixKey: xgatePixKeyObj,
            ip: req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
        };

        console.log('[withdraw] Submitting Withdrawal:', JSON.stringify(withdrawPayload));

        const withdrawRes = await fetch(`${BASE_URL}/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(withdrawPayload),
        });

        const withdrawData = await withdrawRes.json().catch(() => ({}));
        console.log('[withdraw] Final Response:', withdrawData);

        if (!withdrawRes.ok) {
            return NextResponse.json({
                error: withdrawData.message || `XGate rejection (${withdrawRes.status}): ${JSON.stringify(withdrawData)}`
            }, { status: 500 });
        }

        // ── 7. Deduct balance + log transaction ─────────────────────────────────
        await supabase.rpc('decrement_balance', {
            userid: userId,
            amount: totalDeduction
        });

        const externalId = withdrawData?._id || withdrawData?.id || (withdrawData.data ? withdrawData.data.id : 'pending');

        await supabase.from('transactions').insert({
            user_id: userId,
            type: 'WITHDRAWAL',
            amount: totalDeduction,
            status: 'PENDING',
            description: `Saque PIX (XGate) — taxa R$ ${FEE.toFixed(2)}`,
            metadata: { xgate_id: externalId, pix_key: sanitizedPixKey, fee: FEE, net_amount: netAmount, customerId }
        });

        return NextResponse.json({
            success: true,
            message: `Saque solicitado com sucesso! Você receberá R$ ${netAmount.toFixed(2)}`,
            externalId
        });

    } catch (error: any) {
        console.error('[withdraw] Critical Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
