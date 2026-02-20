
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

        // 1. Create Charge in XGate
        const xgateRes = await XGateService.createPixCharge({
            amount,
            userId,
            description: description || `Deposit for User ${userId}`,
            user: {
                name: userData.full_name || "Cliente Predity",
                email: userData.email || "email@predity.com",
                document: userData.document || undefined,
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
                metadata: { xgate_id: externalId }
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
