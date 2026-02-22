import { createClient } from '@/lib/supabase/server';
import LandingPageClient from '@/components/LandingPageClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// This is a Server Component with Instant Load
export default async function LandingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect('/app');
    }

    // 1. Fetch Featured Markets
    const { data: featuredMarkets } = await supabase
        .from('markets')
        .select('*')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });

    // 2. Fetch Trending for Hero
    const { data: trending } = await supabase
        .from('markets')
        .select('*')
        .eq('status', 'OPEN')
        .order('total_pool', { ascending: false })
        .limit(3);

    // Process Hero Cards Data
    const heroCards = trending ? trending.map(m => {
        const pool = m.total_pool || 0;

        let yes = m.total_yes_amount || 0;
        let no = m.total_no_amount || 0;

        if (m.outcome_pools) {
            yes = m.outcome_pools['SIM'] || m.outcome_pools['YES'] || 0;
            no = m.outcome_pools['NÃO'] || m.outcome_pools['NO'] || 0;
        }

        const yesPct = pool > 0 ? (yes / pool) * 100 : 50;
        const yesOddsRaw = yes > 0 ? pool / yes : 2;
        const noOddsRaw = no > 0 ? pool / no : 2;

        // Apply company margin formula
        const yesOdds = Math.max(1.0, 1 + (yesOddsRaw - 1) * 0.65);
        const noOdds = Math.max(1.0, 1 + (noOddsRaw - 1) * 0.65);

        // Expiration Logic
        const end = new Date(m.end_date);
        const now = new Date();
        const diffTime = Math.abs(end.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isToday = end.getDate() === now.getDate() && end.getMonth() === now.getMonth();

        let expireLabel = `Expira em ${diffDays} dias`;
        if (isToday) expireLabel = "EXPIRA HOJE";
        else if (diffDays === 1) expireLabel = "EXPIRA AMANHÃ";

        return {
            id: m.id,
            title: m.title,
            category: m.category,
            yes: yesOdds,
            no: noOdds,
            pct: yesPct,
            expireLabel,
            metadata: m.metadata
        };
    }) : [];

    return (
        <LandingPageClient
            featuredMarkets={featuredMarkets || []}
            heroCards={heroCards || []}
        />
    );
}
