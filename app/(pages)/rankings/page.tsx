import { createClient } from '@/lib/supabase/server';
import RankingsList from '@/components/RankingsList';
import { Trophy } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RankingsPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthed = !!session;

    return (
        <div className="min-h-screen py-24 px-4 bg-[#0f1115]">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header Card */}
                <div
                    className="rounded-2xl border border-white/5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #10161e 0%, #0f1115 60%, #0a110a 100%)' }}
                >
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #F59E0B, #FCD34D, #F59E0B)' }} />
                    <div className="p-6 md:p-8">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border-2 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                <Trophy className="w-8 h-8 text-amber-500" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white">Ranking Geral</h1>
                                <p className="text-sm text-gray-400 mt-1">Os maiores campeões da PredityBR.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rankings Container */}
                <div className="bg-[#0d121a] border border-white/5 rounded-xl p-5 md:p-6">
                    <RankingsList isAuthed={isAuthed} />
                </div>

            </div>
        </div>
    );
}
