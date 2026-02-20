"use client";

import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Share2, ChevronDown, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { format, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MarketDetailClientProps {
    initialMarket: any;
    currentUser: any;
}

const COLORS = ['#EF4444', '#14B8A6', '#EC4899', '#6366F1', '#F59E0B', '#8B5CF6'];

export default function MarketDetailClient({ initialMarket, currentUser }: MarketDetailClientProps) {
    const router = useRouter();

    const [market, setMarket] = useState<any>(initialMarket);
    const [user, setUser] = useState<any>(currentUser);

    const [selectedOutcome, setSelectedOutcome] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [placingBet, setPlacingBet] = useState(false);
    const [timeFilter, setTimeFilter] = useState('Tudo');

    useEffect(() => {
        if (market?.outcomes?.length > 0 && !selectedOutcome) {
            setSelectedOutcome(market.outcomes[0]);
        }
    }, [market, selectedOutcome]);

    useEffect(() => {
        const channel = supabase
            .channel(`market_${market.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${market.id}` },
                (payload) => { setMarket(payload.new); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [market.id]);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) setUser(session.user);
        };
        checkSession();
    }, []);

    const outcomeStats = useMemo(() => {
        if (!market || !market.outcomes) return [];
        const totalPool = market.total_pool || 0;
        // 35% house commission: payouts come from 65% of the accumulated pool
        const payablePool = totalPool * 0.65;
        return market.outcomes.map((outcome: string, index: number) => {
            const outcomePool = market.outcome_pools?.[outcome] || 0;
            let prob = totalPool === 0 ? (100 / market.outcomes.length) : ((outcomePool / totalPool) * 100);
            // Odd = payablePool / outcomePool (never pay more than 65% of total)
            let odds = (totalPool === 0 || outcomePool === 0) ? (market.outcomes.length * 0.65) : (payablePool / outcomePool);
            // Odd floor = 1.0x (100% certainty = money back only, no profit)
            if (odds < 1.0) odds = 1.0;
            return {
                name: outcome,
                prob: prob.toFixed(1),
                odds: odds.toFixed(2),
                color: COLORS[index % COLORS.length]
            };
        }).sort((a: any, b: any) => parseFloat(b.prob) - parseFloat(a.prob));
    }, [market]);

    const chartData = useMemo(() => {
        if (outcomeStats.length === 0) return [];
        const data = [];
        const now = new Date();
        const dataPoints = 20;
        const walks: Record<string, number[]> = {};
        outcomeStats.forEach((stat: any) => {
            const targetProb = parseFloat(stat.prob);
            walks[stat.name] = Array(dataPoints).fill(targetProb);
        });

        for (let i = 0; i < dataPoints; i++) {
            const pointTime = subHours(now, dataPoints - i);
            const dataPoint: any = {
                timeLabel: format(pointTime, i === 0 || i === Math.floor(dataPoints / 2) ? 'dd MMM.' : 'HH:mm', { locale: ptBR }),
            };
            outcomeStats.forEach((stat: any) => {
                dataPoint[stat.name] = walks[stat.name][i];
            });
            data.push(dataPoint);
        }
        return data;
    }, [outcomeStats]);

    const selectedStat = outcomeStats.find((s: any) => s.name === selectedOutcome);
    const parsedAmount = parseFloat(amount) || 0;
    const potentialReturn = selectedStat ? parsedAmount * parseFloat(selectedStat.odds) : 0;

    const handleBet = async () => {
        if (!user) { router.push('/login'); return; }
        if (!selectedOutcome) { alert("Selecione uma opção para apostar."); return; }
        const val = parseFloat(amount);
        if (isNaN(val) || val < 2) {
            alert('Aposta mínima de R$ 2,00');
            return;
        }

        setPlacingBet(true);
        try {
            const { data: userData, error: userError } = await supabase
                .from('users').select('balance').eq('id', user.id).single();
            if (userError || !userData) throw userError || new Error("User data not found");

            if ((userData.balance || 0) < val) {
                alert("Saldo insuficiente! Faça um depósito na carteira.");
                setPlacingBet(false);
                return;
            }

            const currentOdds = parseFloat(selectedStat!.odds);
            const expectedReturn = val * currentOdds;

            const { error: betError } = await supabase.from('bets').insert({
                user_id: user.id,
                market_id: market.id,
                side: selectedOutcome,
                amount: val,
                odds_at_entry: currentOdds,
                potential_payout: expectedReturn,
                status: 'ACTIVE'
            });
            if (betError) throw betError;

            const { error: balanceError } = await supabase.rpc('decrement_balance', { userid: user.id, amount: val });
            if (balanceError) {
                await supabase.from('users').update({ balance: userData.balance - val }).eq('id', user.id);
            }

            const newTotalPool = (market.total_pool || 0) + val;
            const newOutcomePool = (market.outcome_pools?.[selectedOutcome] || 0) + val;

            await supabase.from('markets').update({
                total_pool: newTotalPool,
                outcome_pools: { ...market.outcome_pools, [selectedOutcome]: newOutcomePool }
            }).eq('id', market.id);

            alert(`Aposta confirmada!`);
            setAmount('');
        } catch (err: any) {
            console.error(err);
            alert("Erro ao realizar aposta: " + err.message);
        } finally {
            setPlacingBet(false);
        }
    }

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try { await navigator.share({ title: market.title, text: `Faça sua previsão: ${market.title}`, url }); }
            catch (err) { console.log('Erro ao compartilhar:', err); }
        } else {
            navigator.clipboard.writeText(url);
            alert("Link copiado!");
        }
    };

    if (!market) return <div className="min-h-screen pt-20 text-center text-gray-400">Mercado não encontrado.</div>;

    return (
        <div className="max-w-[1200px] mx-auto p-4 lg:p-8 pb-40 lg:pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

                {/* LEFT COLUMN */}
                <div className="space-y-6">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/app/markets" className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <img src={market.image_url || "https://placehold.co/100"} alt={market.title} className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0" />
                            <h1 className="text-xl font-bold leading-tight line-clamp-2 pr-4">{market.title}</h1>
                        </div>
                        <button onClick={handleShare} className="p-2 bg-surface border border-white/5 rounded-lg text-primary hover:bg-white/5 transition-colors flex-shrink-0">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* CHART SECTION */}
                    <div className="bg-surface rounded-xl border border-white/5 p-4 md:p-6 space-y-6 shadow-lg shadow-black/50">

                        {/* Chart Legend */}
                        <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-300">
                            {outcomeStats.map((stat: any) => (
                                <div key={stat.name} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                                    <span>{stat.name}: {stat.prob}%</span>
                                </div>
                            ))}
                        </div>

                        {/* Line Chart */}
                        <div className="h-[220px] w-full -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="timeLabel" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={(val) => `${Math.round(val)}%`} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                                    {outcomeStats.map((stat: any) => (
                                        <Line key={stat.name} type="monotone" dataKey={stat.name} stroke={stat.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: stat.color }} isAnimationActive={false} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Time Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {['Ao Vivo', '1H', '6H', '1D', '1S', '1M', 'Tudo'].map(tf => (
                                <button key={tf} onClick={() => setTimeFilter(tf)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${timeFilter === tf ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                    {tf}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* DESCRIPTION CARD (below chart) */}
                    {market.description && (
                        <div className="bg-surface rounded-xl border border-white/5 p-4 md:p-6 shadow-lg shadow-black/50">
                            <div className="font-bold text-white mb-2 text-sm uppercase tracking-wider text-gray-400">Detalhes do Mercado</div>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{market.description}</p>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Bet Slip */}
                <div className="relative w-full pb-24 lg:pb-0">
                    <div className="fixed bottom-0 left-0 right-0 z-50 lg:sticky lg:top-24 bg-surface lg:rounded-xl border-t lg:border border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:shadow-2xl overflow-auto lg:max-h-[calc(100vh-6rem)]">

                        <div className="p-4 md:p-5 space-y-4">

                            {/* OUTCOME SELECTOR — inside the card */}
                            <div className="space-y-2">
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Sua previsão</div>
                                <div className={`grid gap-2 ${outcomeStats.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {outcomeStats.map((stat: any) => {
                                        const isSelected = selectedOutcome === stat.name;
                                        return (
                                            <button
                                                key={stat.name}
                                                onClick={() => setSelectedOutcome(stat.name)}
                                                className={`relative p-3 rounded-xl border transition-all text-left overflow-hidden ${isSelected ? 'bg-white/5 border-primary/60 ring-1 ring-primary/40' : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'}`}
                                            >
                                                {/* Progress bg */}
                                                <div className="absolute left-0 top-0 bottom-0 opacity-20 transition-all" style={{ width: `${stat.prob}%`, backgroundColor: stat.color }} />
                                                <div className="relative flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                                        <span className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>{stat.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                        <span className={`text-sm font-black ${isSelected ? 'text-primary' : 'text-gray-400'}`}>{stat.odds}x</span>
                                                        <span className="text-[10px] text-gray-500">{stat.prob}%</span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="border-t border-white/5" />

                            {/* AMOUNT INPUT */}
                            <div className="space-y-3">
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Quantia</div>
                                <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-2 gap-2">
                                    <button onClick={() => setAmount(Math.max(0, (parseFloat(amount) || 0) - 10).toString())}
                                        className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg font-bold">
                                        -
                                    </button>
                                    <div className="flex-1 flex items-center justify-center gap-1">
                                        <span className="text-xl font-bold text-white">R$</span>
                                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                                            className="w-20 bg-transparent text-2xl font-bold text-white focus:outline-none text-center p-0"
                                            placeholder="0" />
                                    </div>
                                    <button onClick={() => setAmount(((parseFloat(amount) || 0) + 10).toString())}
                                        className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg font-bold">
                                        +
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    {[10, 20, 50, 100].map(val => (
                                        <button key={val} onClick={() => setAmount(val.toString())}
                                            className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs font-bold text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                                            +R$ {val}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* REWARD PREVIEW */}
                            <div className="flex items-center justify-between text-sm pt-1 border-t border-white/5">
                                <span className="text-gray-400">Ao acertar</span>
                                <span className="font-bold text-primary text-base">
                                    R$ {potentialReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {/* BET BUTTON */}
                            <button
                                onClick={handleBet}
                                disabled={placingBet || !amount || parseFloat(amount) <= 0 || !selectedOutcome}
                                className="w-full py-3.5 rounded-xl font-bold text-base text-white bg-primary hover:bg-primary/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(4,179,5,0.3)]"
                            >
                                {placingBet ? 'Processando...' : 'Fazer Previsão'}
                            </button>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
