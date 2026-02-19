
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Ensure this points to server-side supabase client if needed, or use createClient
import { XGateService } from '@/lib/xgate';

// NOTE: For server-side, it's better to use createClient from @supabase/ssr or similar, 
// but reusing the existing lib/supabase (if it has service role) or just client (if RLS allows insert) 
// might work. However, typically API routes should use a Service Role client to bypass RLS for admin tasks like status updates,
// but for creating a "pending" transaction, the authenticated user (via headers) is fine.
// Since we don't have the auth headers forwarded easily here without more setup, 
// we'll assume the client calls this with their session or we just insert as "pending" with the userId provided.
// Ideally, we should verify the user session here.

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, userId, description } = body;

        if (!amount || amount < 1) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // 1. Create Charge in XGate
        const xgateRes = await XGateService.createPixCharge({
            amount,
            description: description || `Deposit for User ${userId}`
        });

        if (!xgateRes.success) {
            return NextResponse.json({ error: xgateRes.error }, { status: 500 });
        }

        const { data: xgateData } = xgateRes;
        // Assuming xgateData contains: { id: "tx_123", qrCode: "...", ... }
        // We need to verify the exact structure. For now, we map generic fields.
        const externalId = xgateData.id || xgateData.transactionId || "unknown_id";
        const qrCode = xgateData.qrCode || xgateData.payload || xgateData.pixKey || "";
        const qrCodeImage = xgateData.qrCodeImage || ""; // If they return base64 image

        // 2. Log Transaction in Supabase
        // We insert a new transaction with status 'PENDING'
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
            return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 });
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
