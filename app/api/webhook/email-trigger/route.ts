import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import BetResolvedEmail from '@/components/emails/BetResolvedEmail';

export const dynamic = 'force-dynamic';

// This webhook handles Supabase Database Triggers for the "bets" table updates (status -> WON/LOST)
export async function POST(req: Request) {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY!);

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Authenticate the webhook payload via secret
        const authHeader = req.headers.get('Authorization');
        const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`;

        if (authHeader !== expectedAuth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Payload from Supabase (pg_net)
        const body = await req.json();

        // Supabase DB Webhook structure:
        // { type: 'UPDATE', table: 'bets', record: { ... }, old_record: { ... } }
        const { record, old_record, type, table } = body;

        if (table !== 'bets' || type !== 'UPDATE') {
            return NextResponse.json({ message: 'Ignored non-bet update', ok: true });
        }

        // 3. Check if status changed to WON or LOST
        const oldStatus = old_record?.status;
        const newStatus = record?.status;

        if ((newStatus === 'WON' || newStatus === 'LOST') && oldStatus !== newStatus) {

            // 4. Fetch User and Market details to send the email
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('email, full_name')
                .eq('id', record.user_id)
                .single();

            const { data: market } = await supabaseAdmin
                .from('markets')
                .select('title')
                .eq('id', record.market_id)
                .single();

            if (!user?.email || !market?.title) {
                return NextResponse.json({ error: 'User or Market not found' }, { status: 404 });
            }

            // 5. Send Email via Resend
            const { data, error } = await resend.emails.send({
                from: 'PredityBR <noreply@preditybr.com>',
                to: [user.email],
                subject: newStatus === 'WON' ? `🎉 Você ganhou na previsão: ${market.title}` : `Resultado: ${market.title}`,
                react: BetResolvedEmail({
                    userName: user.full_name || 'Jogador',
                    marketTitle: market.title,
                    outcome: newStatus,
                    amountBetted: record.amount,
                    payout: newStatus === 'WON' ? record.potential_payout : 0,
                }) as React.ReactElement,
            });

            if (error) {
                console.error('[Resend Error]', error);
                return NextResponse.json({ error }, { status: 500 });
            }

            return NextResponse.json({ ok: true, data });
        }

        return NextResponse.json({ message: 'Status did not change to WON/LOST', ok: true });

    } catch (err: any) {
        console.error('[Email Webhook Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
