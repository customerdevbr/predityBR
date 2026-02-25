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
        } else if (pixKeyType === 'EMAIL') {
            if (!sanitizedPixKey.includes('@')) {
                return NextResponse.json({ error: 'Chave PIX de E-mail inválida.' }, { status: 400 });
            }
        } // RANDOM usually has a mix of dashes and letters, no strict validation needed here besides non-empty

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

        // ── 2. Deduct balance + log transaction (PENDING Approval) ───────────────

        // Ensure atomic deduction
        const { error: deductErr } = await supabase.rpc('decrement_balance', {
            userid: userId,
            amount: totalDeduction
        });

        if (deductErr) {
            console.error('[withdraw] Failed to deduct balance:', deductErr);
            return NextResponse.json({ error: 'Falha ao debitar saldo. Tente novamente.' }, { status: 500 });
        }

        const { error: insertErr } = await supabase.from('transactions').insert({
            user_id: userId,
            type: 'WITHDRAWAL',
            amount: totalDeduction,
            status: 'PENDING',
            description: `Saque PIX Solicitado — taxa R$ ${FEE.toFixed(2)}`,
            metadata: {
                pix_key: sanitizedPixKey,
                pix_key_type: pixKeyType || 'CPF',
                fee: FEE,
                net_amount: netAmount
            }
        });

        if (insertErr) {
            console.error('[withdraw] Failed to log transaction:', insertErr);
            // We should ideally rollback the balance here if transaction fails
            return NextResponse.json({ error: 'Falha ao registrar pedido de saque. Contate o suporte.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Saque solicitado com sucesso! Seu pagamento está sob análise e o valor líquido de R$ ${netAmount.toFixed(2)} será enviado em breve.`,
            status: 'PENDING'
        });

    } catch (error: any) {
        console.error('[withdraw] Critical Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
