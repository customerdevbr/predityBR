import { createClient } from '@/lib/supabase/server';
import LoginForm from '@/components/LoginForm';
import HeroCardStack from '@/components/HeroCardStack';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
    const supabase = await createClient();

    // Fetch Trending for Hero Card Stack
    const { data: trending } = await supabase
        .from('markets')
        .select('*')
        .eq('status', 'OPEN')
        .order('total_pool', { ascending: false })
        .limit(3);

    // Process Hero Cards Data (Same logic as LandingPage)
    const heroCards = trending ? trending.map(m => {
        const pool = m.total_pool || 0;
        const yes = m.total_yes_amount || 0;
        const no = m.total_no_amount || 0;
        const yesPct = pool > 0 ? (yes / pool) * 100 : 50;
        const yesOdds = yes > 0 ? pool / yes : 2;
        const noOdds = no > 0 ? pool / no : 2;

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
        <div className="min-h-screen py-12 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full opacity-20 pointer-events-none"></div>

            <div className="w-full max-w-md space-y-8 relative z-10 px-4">
                {/* Hero Stack Above Form */}
                <div className="flex justify-center mb-8 h-48 sm:h-64">
                    <HeroCardStack cards={heroCards} />
                </div>

                {/* Login Form */}
                <LoginForm />
            </div>
        </div>
    );
}
