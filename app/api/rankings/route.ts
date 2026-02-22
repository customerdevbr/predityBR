import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Previne cache e execução estática no tempo de compilação
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabaseAdmin = createSupabaseAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const authClient = await createClient();
        const { data: { session } } = await authClient.auth.getSession();
        const isAuthed = !!session;

        // Trazendo os usuários
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, full_name, avatar_url');

        if (userError) throw userError;

        // Trazendo as apostas (apenas os campos necessários)
        const { data: betsData, error: betsError } = await supabaseAdmin
            .from('bets')
            .select('user_id, amount, potential_payout, status');

        if (betsError) throw betsError;

        // Trazendo as comissões
        const { data: commissionData, error: comError } = await supabaseAdmin
            .from('referral_commissions')
            .select('referrer_id, amount');

        if (comError) throw comError;

        // Agregando em memória para o top (em um app com milhões de linhas, faríamos via Cron Job + Tabela ou View Materializada).
        const rankingMap = new Map<string, any>();

        userData?.forEach((u: any) => {
            rankingMap.set(u.id, {
                id: u.id,
                full_name: u.full_name,
                avatar_url: u.avatar_url,
                total_bets: 0,
                total_revenue: 0,
                total_commission: 0,
            });
        });

        betsData?.forEach((b: any) => {
            const u = rankingMap.get(b.user_id);
            if (u) {
                u.total_bets += 1;
                if (b.status === 'WON') {
                    u.total_revenue += (b.potential_payout || 0) - (b.amount || 0);
                } else if (b.status === 'LOST') {
                    u.total_revenue -= (b.amount || 0);
                }
            }
        });

        commissionData?.forEach((c: any) => {
            const u = rankingMap.get(c.referrer_id);
            if (u) {
                u.total_commission += (c.amount || 0);
            }
        });

        let arr = Array.from(rankingMap.values());

        // Anti-bypass Blur: Only send actual names/avatars to logged-in users.
        if (!isAuthed) {
            arr = arr.map(u => ({
                ...u,
                full_name: 'Jogador Oculto',
                avatar_url: null
            }));
        }

        return new Response(JSON.stringify(arr), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
