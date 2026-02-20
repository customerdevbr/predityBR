"use client";

import Link from 'next/link';
import { Clock, TrendingUp, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { useEffect, useState } from 'react';

interface MarketCardProps {
    id: string;
    title: string;
    category: string;
    imageUrl?: string;
    endDate: string;
    pool: number;
    yesAmount: number;
    noAmount: number;
    outcomes?: string[]; // New
    outcomePools?: Record<string, number>; // New
    metadata?: any;
    slug?: string;
}

export default function MarketCard({ id, title, category, imageUrl, endDate, pool, yesAmount, noAmount, outcomes, outcomePools, metadata, slug }: MarketCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [ticker, setTicker] = useState<{ id: number, value: number, type: 'yes' | 'no', top: number, left: number }[]>([]);

    // Live Ticker Effect & Realtime Odds
    const [livePool, setLivePool] = useState(pool);
    const [liveYes, setLiveYes] = useState(yesAmount);
    const [liveNo, setLiveNo] = useState(noAmount);
    const [liveOutcomePools, setLiveOutcomePools] = useState(outcomePools);

    // Sync props to state if they change from parent refresh
    useEffect(() => {
        setLivePool(pool);
        setLiveYes(yesAmount);
        setLiveNo(noAmount);
        setLiveOutcomePools(outcomePools);
    }, [pool, yesAmount, noAmount, outcomePools]);

    useEffect(() => {
        // Ticker Logic
        const interval = setInterval(() => {
            // ... existing ticker logic ...
            if (Math.random() > 0.5) return;
            const tickerId = Date.now();
            const value = Math.floor(Math.random() * 200) + 10;
            const type = Math.random() > 0.5 ? 'yes' : 'no';
            const top = Math.random() * 40 + 30;
            const left = Math.random() * 60 + 20;

            setTicker(prev => [...prev.slice(-3), { id: tickerId, value, type, top, left }]);

            setTimeout(() => {
                setTicker(prev => prev.filter(t => t.id !== tickerId));
            }, 1200);
        }, 3000);

        // Realtime Subscription
        const channel = supabase
            .channel(`market-${id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${id}` },
                (payload) => {
                    const newMarket = payload.new;
                    setLivePool(newMarket.total_pool);
                    setLiveYes(newMarket.total_yes_amount);
                    setLiveNo(newMarket.total_no_amount);
                    // outcome_pools is a JSONB column, might need parsing if it comes as string, but usually object in payload
                    if (newMarket.outcome_pools) {
                        setLiveOutcomePools(newMarket.outcome_pools);
                    }
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [id]);

    // Use live values for calculation
    const currentPool = livePool;
    const currentYes = liveYes;
    const currentNo = liveNo;
    const currentOutcomePools = liveOutcomePools;

    // Odds Calculation
    // Simplified probabilities (ignoring margin for raw % display if desired, or using identical approach)
    // To match MarketDetailClient EXACTLY:
    const probYes = currentPool === 0 ? 0.5 : ((currentYes || 1) / currentPool);
    const probNo = currentPool === 0 ? 0.5 : ((currentNo || 1) / currentPool);

    // Odds (Payout Multiplier) with 18% margin, exact same as MarketDetailClient
    const oddsYes = (currentPool === 0 || currentYes === 0) ? (2 * 0.82) : ((currentPool * 0.82) / currentYes);
    const oddsNo = (currentPool === 0 || currentNo === 0) ? (2 * 0.82) : ((currentPool * 0.82) / currentNo);

    const formatOdds = (val: number) => (val < 1.01 ? 1.01 : val).toFixed(2);

    // Fallback percentages for binary display
    const yesPct = Math.round(probYes * 100);
    const noPct = Math.round(probNo * 100);

    // Synthetic Chart Data (Two lines "fighting")
    const [chartData] = useState(() => {
        const points = 20;
        const data = [];
        let currentYes = yesPct;

        // Generate backwards
        for (let i = 0; i < points; i++) {
            const currentNo = 100 - currentYes;
            data.unshift({ yes: currentYes, no: currentNo });

            // Random walk
            currentYes = currentYes + (Math.random() * 10 - 5);
            if (currentYes < 10) currentYes = 10;
            if (currentYes > 90) currentYes = 90;
        }
        return data;
    });

    // Time Remaining Logic
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = differenceInDays(end, now);
    const timeDisplay = formatDistanceToNow(end, { locale: ptBR, addSuffix: false });
    const isUrgent = daysLeft < 2;

    return (
        <Link
            href={`/app/markets/${slug || id}`}
            className="block group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="bg-[#151921] border border-white/5 hover:border-white/20 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col h-full relative group-hover:shadow-primary/10">

                {/* Header: Image & Time */}
                <div className="relative h-32 bg-gray-800 overflow-hidden">
                    {imageUrl ? (
                        <img src={imageUrl} alt={title} className="w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-all duration-700 group-hover:scale-105" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black"></div>
                    )}

                    <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 bg-black/60 backdrop-blur border border-white/10 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                            {category}
                        </span>
                    </div>

                    <div className={`absolute top-3 right-3 px-2 py-1 rounded backdrop-blur border flex items-center gap-1.5 shadow-lg ${isUrgent ? 'bg-red-500/80 text-white border-red-500' : 'bg-black/60 border-white/10 text-gray-300'}`}>
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-bold uppercase">{timeDisplay}</span>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-4 flex-1 flex flex-col relative bg-[#151921]">
                    {/* Background Chart (Lines Fighting) */}
                    <div className="absolute inset-x-0 top-0 h-24 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <Line type="monotone" dataKey="yes" stroke="#22c55e" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="no" stroke="#ef4444" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Live Ticker Bubbles overlaying chart */}
                    {ticker.map(t => (
                        <div
                            key={t.id}
                            className={`absolute z-20 px-2 py-0.5 text-[10px] font-bold rounded-full shadow-lg animate-[float_1.2s_ease-out_forwards] pointer-events-none border ${t.type === 'yes' ? 'bg-green-500/90 text-white border-green-400' : 'bg-red-500/90 text-white border-red-400'}`}
                            style={{ top: `${t.top}%`, left: `${t.left}%` }}
                        >
                            {t.type === 'yes' ? 'SIM' : 'NÃO'} +R${t.value}
                        </div>
                    ))}

                    {/* Title */}
                    <div className="relative z-10 mb-4 h-14">
                        <h3 className="text-sm font-medium leading-snug text-gray-200 group-hover:text-white transition-colors line-clamp-2">
                            {title}
                        </h3>
                    </div>

                    {/* Odds & Buttons - Dynamic Outcomes */}
                    <div className="relative z-10 mt-auto min-h-[80px]">
                        {/* Calculate all outcomes first to sort them by probability/odds */}
                        {(() => {
                            const availableOutcomes = (outcomes && outcomes.length > 0) ? outcomes : ['SIM', 'NÃO'];

                            const sortedStats = availableOutcomes.map(outcome => {
                                let amount = currentOutcomePools ? currentOutcomePools[outcome] || 0 : 0;
                                if (!currentOutcomePools) {
                                    if ((outcome === 'SIM' || outcome === 'YES') && currentYes) amount = currentYes;
                                    if ((outcome === 'NÃO' || outcome === 'NO') && currentNo) amount = currentNo;
                                }

                                // Safe math matching MarketDetailClient EXACTLY
                                const pctRaw = currentPool === 0 ? (100 / availableOutcomes.length) : ((amount / currentPool) * 100);
                                const pct = Math.round(pctRaw) || 0;

                                let oddsRaw = (currentPool === 0 || amount === 0) ? (availableOutcomes.length * 0.82) : ((currentPool * 0.82) / amount);
                                const odds = (oddsRaw < 1.01 ? 1.01 : oddsRaw).toFixed(2);

                                let textColors = 'text-gray-400';
                                let bgBarColor = 'bg-gray-500/20';
                                const norm = outcome.toUpperCase();
                                if (norm === 'SIM' || norm === 'YES') {
                                    textColors = 'text-green-500'; bgBarColor = 'bg-green-500/20 bg-opacity-30';
                                } else if (norm === 'NÃO' || norm === 'NO') {
                                    textColors = 'text-red-500'; bgBarColor = 'bg-red-500/20 bg-opacity-30';
                                } else {
                                    textColors = 'text-blue-500'; bgBarColor = 'bg-blue-500/20 bg-opacity-30';
                                }

                                return { outcome, amount, odds, pct, textColors, bgBarColor };
                            }).sort((a, b) => b.pct - a.pct); // Highest prob first

                            if (availableOutcomes.length <= 2) {
                                // DEFAULT GRID (Side-By-Side)
                                return (
                                    <div className="grid grid-cols-2 gap-3 mt-auto">
                                        {sortedStats.map((stat) => (
                                            <div key={stat.outcome} className={`bg-surface hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg p-2 text-center transition-all group/btn`}>
                                                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 truncate px-1" title={stat.outcome}>{stat.outcome}</div>
                                                <div className={`text-2xl font-black ${stat.textColors} group-hover/btn:scale-110 transition-transform`}>
                                                    {stat.odds}x
                                                </div>
                                                <div className="text-[10px] text-gray-500">{stat.pct}%</div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            } else {
                                // MULTI-OPTION LEADERBOARD
                                const top3 = sortedStats.slice(0, 3);
                                const remainingCount = sortedStats.length - 3;

                                return (
                                    <div className="space-y-1.5 flex flex-col justify-end mt-auto">
                                        {top3.map((stat, idx) => (
                                            <div key={stat.outcome} className="relative z-0 bg-black/40 border border-white/5 rounded pl-3 pr-2 py-1.5 flex items-center justify-between overflow-hidden group/row hover:bg-white/[0.04] transition-colors">
                                                {/* Progress Bar Background */}
                                                <div
                                                    className={`absolute left-0 top-0 bottom-0 ${stat.bgBarColor} transition-all duration-700 -z-10`}
                                                    style={{ width: `${stat.pct}%` }}
                                                />

                                                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                                                    <span className="text-gray-500 text-[10px] font-bold w-3 text-right flex-shrink-0">{idx + 1}</span>
                                                    <span className="text-sm font-bold text-gray-200 truncate" title={stat.outcome}>{stat.outcome}</span>
                                                </div>
                                                <div className="flex flex-col items-end flex-shrink-0">
                                                    <span className={`text-sm font-black ${stat.textColors}`}>{stat.odds}x</span>
                                                    <span className="text-[9px] text-gray-500 font-bold -mt-1">{stat.pct}%</span>
                                                </div>
                                            </div>
                                        ))}
                                        {remainingCount > 0 && (
                                            <div className="text-center pt-1.5 text-[10px] uppercase font-bold text-gray-500">
                                                + {remainingCount} outras opções
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>

                <style jsx>{`
                    @keyframes float {
                        0% { transform: translateY(0) scale(0.8); opacity: 0; }
                        20% { transform: translateY(-10px) scale(1); opacity: 1; }
                        100% { transform: translateY(-30px) scale(0.9); opacity: 0; }
                    }
                `}</style>
            </div>
        </Link>
    );
}
