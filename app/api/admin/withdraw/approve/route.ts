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
        const { transactionId } = body;

        if (!transactionId) {
            return NextResponse.json({ error: 'ID da transação obrigatório' }, { status: 400 });
        }

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

        // ── 1. Validate Admin ───────────────────────────────────────────────────
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { data: adminUser } = await supabase.from('users').select('role').eq('id', session.user.id).single();
        if (adminUser?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // ── 2. Fetch Transaction & User Details ─────────────────────────────────
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .select('*, users(*)')
            .eq('id', transactionId)
            .single();

        if (txError || !tx) {
            return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
        }

        if (tx.status !== 'PENDING' || tx.type !== 'WITHDRAWAL') {
            return NextResponse.json({ error: 'Transação inválida para aprovação' }, { status: 400 });
        }

        const userData = tx.users;
        const metadata = tx.metadata || {};
        const pixKey = metadata.pix_key;
        let pixKeyType = metadata.pix_key_type || 'CPF';
        const netAmount = metadata.net_amount || (tx.amount - (metadata.fee || 2.90));

        if (!pixKey) {
            return NextResponse.json({ error: 'Chave PIX não encontrada nos metadados da transação' }, { status: 400 });
        }

        // XGate uses 'EVP' for random keys
        if (pixKeyType === 'RANDOM') pixKeyType = 'EVP';

        console.log(`[admin-withdraw] Approving TX ${transactionId} for User ${userData.id} - ${netAmount} BRL to ${pixKeyType} ${pixKey}`);

        // ── 3. XGate: Login & Setup ──────────────────────────────────────────
        const token = await xgateLogin();
        let customerId = userData.xgate_customer_id;

        if (!customerId) {
            console.log(`[admin-withdraw] customerId missing for user ${userData.id}, creating in XGate...`);
            const userCpfClean = userData.document?.replace(/\D/g, '') || '';
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

            if (createRes.ok) {
                customerId = createData._id || createData.id;
            } else {
                console.log(`[admin-withdraw] Customer creation failed (code ${createRes.status}), attempting lookup...`);
                const listRes = await fetch(`${BASE_URL}/customers?limit=1&document=${userCpfClean}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const listData = await listRes.json().catch(() => []);
                const found = Array.isArray(listData) ? listData[0] : (listData.data ? listData.data[0] : null);
                if (found) {
                    customerId = found._id || found.id;
                }
            }

            if (!customerId) {
                return NextResponse.json({ error: `Falha ao identificar cliente na XGate: ${JSON.stringify(createData)}` }, { status: 500 });
            }
            await supabase.from('users').update({ xgate_customer_id: customerId } as any).eq('id', userData.id);
        }

        // ── 4. XGate: Ensure PIX Key is registered ──────────
        const keysRes = await fetch(`${BASE_URL}/pix/customer/${customerId}/key`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const keysData = await keysRes.json().catch(() => ({}));
        const existingKeys = Array.isArray(keysData) ? keysData : (keysData.data || []);

        let xgatePixKeyObj = existingKeys.find((k: any) => {
            const kVal = (k.key || k.pixKey || '').replace(/\D/g, '');
            const targetVal = pixKey.replace(/\D/g, '');
            if (pixKeyType === 'CPF' || pixKeyType === 'PHONE') {
                return kVal === targetVal;
            }
            return (k.key === pixKey || k.pixKey === pixKey);
        });

        if (!xgatePixKeyObj) {
            console.log(`[admin-withdraw] PIX key "${pixKey}" not found, registering as ${pixKeyType}...`);
            const registRes = await fetch(`${BASE_URL}/pix/customer/${customerId}/key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    key: pixKey,
                    type: pixKeyType
                }),
            });
            const registData = await registRes.json().catch(() => ({}));

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

        const withdrawRes = await fetch(`${BASE_URL}/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(withdrawPayload),
        });

        const withdrawData = await withdrawRes.json().catch(() => ({}));

        if (!withdrawRes.ok) {
            return NextResponse.json({
                error: withdrawData.message || `XGate rejection (${withdrawRes.status})`,
                details: withdrawData
            }, { status: 500 });
        }

        // ── 7. Mark as Completed ──────────────────────────────────────────────
        const externalId = withdrawData?._id || withdrawData?.id || (withdrawData.data ? withdrawData.data.id : 'approved_by_admin');

        const { error: updateErr } = await supabase.from('transactions')
            .update({
                status: 'COMPLETED',
                metadata: { ...metadata, xgate_id: externalId, approved_by: session.user.id }
            })
            .eq('id', transactionId);

        if (updateErr) {
            console.error('[admin-withdraw] Paid on XGate but failed to update DB:', updateErr);
            return NextResponse.json({ error: 'Pago na XGate, mas falhou ao atualizar banco de dados.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Saque aprovado e processado com sucesso!`,
            externalId
        });

    } catch (error: any) {
        console.error('[admin-withdraw] Critical Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
