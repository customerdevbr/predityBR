"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Target, TrendingUp, Users, User as UserIcon, Medal } from 'lucide-react';

interface RankUser {
    id: string;
    full_name: string;
    avatar_url: string | null;
    total_bets: number;
    total_revenue: number;
    total_commission: number;
}

interface RankingsListProps {
    isAuthed: boolean;
}

export default function RankingsList({ isAuthed }: RankingsListProps) {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<RankUser[]>([]);
    const [viewMode, setViewMode] = useState<'BETS' | 'REVENUE' | 'COMMISSION'>('BETS');

    useEffect(() => {
        const loadRankings = async () => {
            setLoading(true);
            try {
                // Fetch basic users (limit 50 randomly or active)
                // In a highly scaled production, this should be an RPC or materialized view.
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id, full_name, avatar_url');

                if (userError) throw userError;

                const { data: betsData, error: betsError } = await supabase
                    .from('bets')
                    .select('user_id, amount, potential_payout, status');

                if (betsError) throw betsError;

                const { data: commissionData, error: comError } = await supabase
                    .from('referral_commissions')
                    .select('referrer_id, amount');

                if (comError) throw comError;

                // Aggregate
                const rankingMap = new Map<string, RankUser>();

                userData?.forEach((u: any) => {
                    rankingMap.set(u.id, {
                        ...u,
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
                setUsers(arr);
            } catch (err) {
                console.error("Erro ao carregar rankings", err);
            } finally {
                setLoading(false);
            }
        };

        loadRankings();
    }, []);

    const getSortedUsers = () => {
        const copy = [...users];
        if (viewMode === 'BETS') {
            return copy.sort((a, b) => b.total_bets - a.total_bets).slice(0, 10);
        }
        if (viewMode === 'REVENUE') {
            return copy.sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 10);
        }
        if (viewMode === 'COMMISSION') {
            return copy.sort((a, b) => b.total_commission - a.total_commission).slice(0, 10);
        }
        return copy.slice(0, 10);
    };

    const sortedUsers = getSortedUsers();

    if (loading) {
        return (
            <div className="py-24 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Control Tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {[
                    { key: 'BETS', label: 'Volume (Previsões)', icon: Target },
                    { key: 'REVENUE', label: 'Rendimentos', icon: TrendingUp },
                    { key: 'COMMISSION', label: 'Comissões', icon: Users },
                ].map((f) => {
                    const isActive = viewMode === f.key;
                    const Icon = f.icon;
                    return (
                        <button
                            key={f.key}
                            onClick={() => setViewMode(f.key as any)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border flex items-center gap-2 ${isActive
                                    ? 'bg-primary text-white border-primary shadow-[0_0_12px_rgba(47,124,70,0.4)]'
                                    : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {f.label}
                        </button>
                    )
                })}
            </div>

            {!isAuthed && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-4 mb-4">
                    <Trophy className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold text-amber-500">Ranking Oculto</h4>
                        <p className="text-sm text-amber-500/80 mt-1">
                            Você não está logado. Por motivo de privacidade, os dados estão ofuscados. Crie sua conta e entre na plataforma para ver quem está dominando as posições e garantir a sua!
                        </p>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-[#0d121a] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5 relative">
                {sortedUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Nenhum dado encontrado para este ranking.</div>
                ) : (
                    sortedUsers.map((u, i) => (
                        <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-amber-900 shadow-[0_0_15px_rgba(251,191,36,0.5)]' :
                                        i === 1 ? 'bg-slate-300 text-slate-900' :
                                            i === 2 ? 'bg-orange-400 text-orange-900' :
                                                'bg-white/5 text-gray-400 font-bold'
                                    }`}>
                                    {i + 1}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full bg-[#1a2a1a] flex items-center justify-center overflow-hidden border border-white/10 ${!isAuthed ? 'blur-sm grayscale' : ''}`}>
                                        {u.avatar_url ? (
                                            <img src={u.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-5 h-5 text-gray-500" />
                                        )}
                                    </div>
                                    <h3 className={`font-bold text-white max-w-[120px] md:max-w-xs truncate ${!isAuthed ? 'blur-[4px] select-none text-transparent bg-white/50 bg-clip-text' : ''}`}>
                                        {u.full_name || 'Jogador Oculto'}
                                    </h3>
                                </div>
                            </div>

                            <div className="text-right">
                                {viewMode === 'BETS' && (
                                    <>
                                        <div className="text-sm font-black text-white">{u.total_bets}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Previsões</div>
                                    </>
                                )}
                                {viewMode === 'REVENUE' && (
                                    <>
                                        <div className={`text-sm font-black ${u.total_revenue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            R$ {u.total_revenue.toFixed(2)}
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Lucro Real</div>
                                    </>
                                )}
                                {viewMode === 'COMMISSION' && (
                                    <>
                                        <div className="text-sm font-black text-blue-400">
                                            R$ {u.total_commission.toFixed(2)}
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Ganhos de Ref</div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
