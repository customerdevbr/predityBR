
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint receives notifications from XGate
export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("XGate Webhook Body:", JSON.stringify(body, null, 2));

        const id = body.id || body.transactionId || body.orderId || body.uuid;
        const status = (body.status || "").toUpperCase();

        const isPaid = status === 'PAID' || status === 'COMPLETED' || status === 'APPROVED' || status === 'SUCCEEDED';

        if (!isPaid) {
            console.log(`[Webhook] Status ${status} is not paid. Ignoring.`);
            return NextResponse.json({ received: true, status: 'ignored' });
        }

        if (!id) {
            console.error("[Webhook] No ID found in body");
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        // We MUST use the Service Role Key to bypass RLS in a webhook
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
            console.error("[CRITICAL] SUPABASE_SERVICE_ROLE_KEY is missing! Webhook cannot bypass RLS to update balance.");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

        console.log("[Webhook] Querying transaction with xgate_id:", id);
        // Using contains filter on JSONB column
        const { data: tx, error: txError } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .contains('metadata', { xgate_id: id })
            .single();

        if (txError || !tx) {
            console.error("Transaction not found for ID:", id, txError);
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        if (tx.status === 'COMPLETED') {
            return NextResponse.json({ received: true, message: "Already completed" });
        }

        console.log(`[Webhook] Updating transaction ${tx.id} to COMPLETED`);
        const { error: updateError } = await supabaseAdmin
            .from('transactions')
            .update({ status: 'COMPLETED' })
            .eq('id', tx.id);

        if (updateError) {
            console.error("Error updating transaction:", updateError);
            throw updateError;
        }

        console.log(`[Webhook] Fetching balance for user ${tx.user_id}`);
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('balance')
            .eq('id', tx.user_id)
            .single();

        if (user && !userError) {
            const newBalance = (Number(user.balance) || 0) + Number(tx.amount);
            console.log(`[Webhook] Updating balance from ${user.balance} to ${newBalance}`);
            const { error: balanceError } = await supabaseAdmin
                .from('users')
                .update({ balance: newBalance })
                .eq('id', tx.user_id);

            if (balanceError) console.error("Error updating user balance:", balanceError);

            // Affiliate commission: 15% on first deposit
            try {
                // Check if this is user's first completed deposit
                const { count: priorDeposits } = await supabaseAdmin
                    .from('transactions')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', tx.user_id)
                    .eq('type', 'DEPOSIT')
                    .eq('status', 'COMPLETED')
                    .neq('id', tx.id);

                if ((priorDeposits ?? 0) === 0) {
                    // First deposit — check if user was referred
                    const { data: referredUser } = await supabaseAdmin
                        .from('users')
                        .select('referred_by, balance')
                        .eq('id', tx.user_id)
                        .single();

                    if (referredUser?.referred_by) {
                        const commission = Number(tx.amount) * 0.15;
                        console.log(`[Affiliate] Paying R$ ${commission.toFixed(2)} commission to referrer ${referredUser.referred_by}`);

                        // Credit referrer
                        const { data: referrer } = await supabaseAdmin
                            .from('users')
                            .select('balance')
                            .eq('id', referredUser.referred_by)
                            .single();

                        if (referrer) {
                            await supabaseAdmin.from('users').update({
                                balance: (Number(referrer.balance) || 0) + commission
                            }).eq('id', referredUser.referred_by);
                        }

                        // Log commission
                        await supabaseAdmin.from('referral_commissions').insert({
                            referrer_id: referredUser.referred_by,
                            referred_id: tx.user_id,
                            deposit_id: tx.id,
                            amount: commission,
                            status: 'PAID',
                        });

                        // Log as transaction for referrer
                        await supabaseAdmin.from('transactions').insert({
                            user_id: referredUser.referred_by,
                            type: 'COMMISSION',
                            amount: commission,
                            status: 'COMPLETED',
                            description: `Comissão de afiliado (15%)`
                        });
                    }
                }
            } catch (affErr) {
                console.error("[Affiliate] Error processing commission:", affErr);
            }
        } else {
            console.error("Error fetching user for balance update:", userError);
        }

        return NextResponse.json({ received: true, status: 'COMPLETED' });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

