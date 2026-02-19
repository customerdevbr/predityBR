
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This endpoint receives notifications from XGate
export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("XGate Webhook Body:", JSON.stringify(body, null, 2));

        // Flexible parsing
        const id = body.id || body.transactionId || body.orderId || body.uuid;
        const status = (body.status || "").toUpperCase();

        // Check if status indicates success
        const isPaid = status === 'PAID' || status === 'COMPLETED' || status === 'APPROVED' || status === 'SUCCEEDED';

        if (!isPaid) {
            console.log(`[Webhook] Status ${status} is not paid. Ignoring.`);
            return NextResponse.json({ received: true, status: 'ignored' });
        }

        if (!id) {
            console.error("[Webhook] No ID found in body");
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        // Find the transaction by external ID stored in metadata
        // We try to match 'xgate_id' inside the metadata JSON column
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .contains('metadata', { xgate_id: id })
            .single();

        if (txError || !tx) {
            console.error("Transaction not found for ID:", id);
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        if (tx.status === 'COMPLETED') {
            return NextResponse.json({ received: true, message: "Already completed" });
        }

        // Update Transaction Status
        const { error: updateError } = await supabase
            .from('transactions')
            .update({ status: 'COMPLETED' })
            .eq('id', tx.id);

        if (updateError) throw updateError;

        // Credit User Balance
        // Fetch current balance first to be safe, or use an RPC increment function if available (recommended for concurrency)
        // For now, we read-then-write
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('balance')
            .eq('id', tx.user_id)
            .single();

        if (user && !userError) {
            const newBalance = (user.balance || 0) + Number(tx.amount);
            await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('id', tx.user_id);
        }

        return NextResponse.json({ received: true, status: 'COMPLETED' });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
