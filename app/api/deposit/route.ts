
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { XGateService } from '@/lib/xgate';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, userId, description } = body;

        if (!amount || amount < 10) {
            return NextResponse.json({ error: 'Valor mínimo de depósito: R$ 10,00' }, { status: 400 });
        }

        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set() { },
                    remove() { }
                }
            }
        );

        // Fetch user details - NOW AUTHENTICATED VIA COOKIE
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !userData) {
            console.error("User fetch error:", userError);
            console.error("Searching for userId:", userId);

            return NextResponse.json({
                error: 'User not found or you are not logged in correctly. Please login again.',
                details: userError
            }, { status: 404 });
        }

        // Require real CPF — must match the PIX account holder's document
        if (!userData.document || userData.document.trim() === '') {
            return NextResponse.json({
                error: 'CPF obrigatório: Adicione seu CPF (idêntico ao da conta PIX) no seu Perfil antes de depositar.'
            }, { status: 400 });
        }

        // Validate CPF checksum (rejects fake CPFs like 000.000.000-00)
        const { validateCpf } = await import('@/lib/cpf');
        const cpfCheck = validateCpf(userData.document);
        if (!cpfCheck.valid) {
            return NextResponse.json({
                error: `CPF inválido no seu perfil: ${cpfCheck.error} Por favor, corrija o CPF nas configurações do seu Perfil.`
            }, { status: 400 });
        }

        // 1. Create Charge in XGate
        const xgateRes = await XGateService.createPixCharge({
            amount,
            userId,
            description: description || `Deposit for User ${userId}`,
            user: {
                name: userData.full_name || "Cliente Predity",
                email: userData.email || "email@predity.com",
                document: userData.document,
                phone: userData.phone || undefined
            }
        });

        if (!xgateRes.success) {
            return NextResponse.json({ error: xgateRes.error }, { status: 500 });
        }

        const { data: xgateData } = xgateRes;
        const d = xgateData.data || xgateData;

        const externalId = d.id || d.transactionId || d.orderId || d._id || "unknown_id";
        const qrCode = d.code || d.qrCode || d.payload || d.pixKey || d.qrCodeText || d.paymentCode || d.pixCopiaECola || d.emv || d.codigoPix || "";
        const qrCodeImage = d.qrCodeImage || d.qrCodeBase64 || d.image || d.imagemPix || "";

        // ── Capture XGate customerId and store in users table ────────────────
        // XGate may return the customer ID in various paths depending on API version
        const xgateCustomerId =
            d.customer?._id ||
            d.customer?.id ||
            d.customerId ||
            d.clientId ||
            null;

        if (xgateCustomerId) {
            // Store customer ID in users table (requires xgate_customer_id column — see migration SQL in supabase/migrations/)
            // Wrapped in try/catch so it doesn't break deposits if column not yet created
            try {
                await supabase
                    .from('users')
                    .update({ xgate_customer_id: xgateCustomerId } as any)
                    .eq('id', userId);
                console.log(`[deposit] Stored xgate_customer_id=${xgateCustomerId} for user ${userId}`);
            } catch {
                console.warn(`[deposit] Could not store xgate_customer_id — column may not exist yet. Run migration: supabase/migrations/20240220_add_xgate_customer_id.sql`);
            }
        }

        if (!qrCode) {
            return NextResponse.json({ error: `Estrutura da resposta XGate: ${JSON.stringify(xgateData)}` }, { status: 500 });
        }

        // 2. Log Transaction in Supabase
        const { data: tx, error: dbError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'DEPOSIT',
                amount: amount,
                status: 'PENDING',
                description: `Depósito PIX (XGate)`,
                metadata: { xgate_id: externalId, xgate_customer_id: xgateCustomerId }
            })
            .select()
            .single();

        if (dbError) {
            console.error("DB Error:", dbError);
            // If RLS blocks insert, we still return success with the PIX code so user can pay
            // But we warn in console.
            console.error("CRITICAL: Failed to save transaction in DB (RLS policy missing?). Returning PID code anyway.");
            return NextResponse.json({
                success: true,
                qrCode,
                qrCodeImage,
                transactionId: "saved-failed-rls",
                externalId,
                warning: "Boleto gerado, mas transação não salva no histórico por falha de permissão."
            });
        }

        return NextResponse.json({
            success: true,
            qrCode,
            qrCodeImage,
            transactionId: tx.id,
            externalId
        });

    } catch (error: any) {
        console.error("Deposit API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
