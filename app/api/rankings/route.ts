import { createClient } from '@supabase/supabase-js';

// Usamos a SERVICE_ROLE KEY para bypassar o RLS e trazer as somatórias de rankings para o público.
// Isso evita expor os dados reais dos usuários através da anonimização de dados que não precisam ser públicos.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    try {
        // Trazendo os usuários
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, full_name, avatar_url');

        if (userError) throw userError;

        // Trazendo as apostas (apenas os campos necessários)
        const { data: betsData, error: betsError } = await supabase
            .from('bets')
            .select('user_id, amount, potential_payout, status');

        if (betsError) throw betsError;

        // Trazendo as comissões
        const { data: commissionData, error: comError } = await supabase
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

        const arr = Array.from(rankingMap.values());

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
