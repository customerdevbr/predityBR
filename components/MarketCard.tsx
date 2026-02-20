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
    outcomes?: string[];
    outcomePools?: Record<string, number>;
    outcomeImages?: Record<string, string>; // NEW: map of outcome name -> image URL
    metadata?: any;
    slug?: string;
}

export default function MarketCard({ id, title, category, imageUrl, endDate, pool, yesAmount, noAmount, outcomes, outcomePools, outcomeImages, metadata, slug }: MarketCardProps) {
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

    // Odds (Payout Multiplier) with 35% house commission: payouts = 65% of pool
    const payableYes = currentPool * 0.65;
    const payableNo = currentPool * 0.65;
    const oddsYes = (currentPool === 0 || currentYes === 0) ? (2 * 0.65) : (payableYes / currentYes);
    const oddsNo = (currentPool === 0 || currentNo === 0) ? (2 * 0.65) : (payableNo / currentNo);

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
                    <div className="relative z-10 mt-auto" style={{ minHeight: 100 }}>
                        {(() => {
                            const availableOutcomes = (outcomes && outcomes.length > 0) ? outcomes : ['SIM', 'NÃO'];

                            const sortedStats = availableOutcomes.map(outcome => {
                                let amount = currentOutcomePools ? currentOutcomePools[outcome] || 0 : 0;
                                if (!currentOutcomePools) {
                                    if ((outcome === 'SIM' || outcome === 'YES') && currentYes) amount = currentYes;
                                    if ((outcome === 'NÃO' || outcome === 'NO') && currentNo) amount = currentNo;
                                }

                                const pctRaw = currentPool === 0 ? (100 / availableOutcomes.length) : ((amount / currentPool) * 100);
                                const pct = Math.round(pctRaw) || 0;

                                let oddsRaw = (currentPool === 0 || amount === 0) ? (availableOutcomes.length * 0.65) : ((currentPool * 0.65) / amount);
                                const odds = (oddsRaw < 1.01 ? 1.01 : oddsRaw).toFixed(2);

                                const norm = outcome.toUpperCase();
                                const isSim = norm === 'SIM' || norm === 'YES';
                                const isNao = norm === 'NÃO' || norm === 'NO';
                                const color = isSim ? { text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'hover:shadow-[0_0_16px_rgba(52,211,153,0.25)]', bar: 'bg-emerald-500/15', pill: 'bg-emerald-500/10 text-emerald-400' }
                                    : isNao ? { text: 'text-red-400', border: 'border-red-500/30', glow: 'hover:shadow-[0_0_16px_rgba(239,68,68,0.25)]', bar: 'bg-red-500/15', pill: 'bg-red-500/10 text-red-400' }
                                        : { text: 'text-blue-400', border: 'border-blue-500/30', glow: 'hover:shadow-[0_0_16px_rgba(96,165,250,0.25)]', bar: 'bg-blue-500/15', pill: 'bg-blue-500/10 text-blue-400' };

                                return { outcome, amount, odds, pct, color };
                            }).sort((a, b) => b.pct - a.pct);

                            if (availableOutcomes.length <= 2) {
                                // BINARY — tall buttons with glow effect + outcome image as bg
                                return (
                                    <div className="grid grid-cols-2 gap-2 mt-auto h-[100px]">
                                        {sortedStats.map((stat) => {
                                            const imgSrc = outcomeImages?.[stat.outcome] || metadata?.outcome_images?.[stat.outcome] ||
                                                (stat.outcome === 'SIM' || stat.outcome === 'YES' ? metadata?.yes_image : metadata?.no_image) || '';
                                            return (
                                                <div
                                                    key={stat.outcome}
                                                    className={`relative overflow-hidden flex flex-col items-center justify-center rounded-xl border ${stat.color.border} ${stat.color.glow} transition-all duration-300 cursor-pointer group/btn hover:scale-[1.02] active:scale-[0.98] h-full`}
                                                >
                                                    {/* Bg image */}
                                                    {imgSrc && (
                                                        <img src={imgSrc} alt={stat.outcome} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover/btn:opacity-45 transition-opacity duration-300 scale-105" />
                                                    )}
                                                    {/* Color tint overlay */}
                                                    <div className={`absolute inset-0 ${stat.color.bar} opacity-70`} />
                                                    {/* Content */}
                                                    <div className="relative z-10 flex flex-col items-center gap-0.5">
                                                        <span className="text-[10px] text-gray-300 uppercase font-bold tracking-wide drop-shadow">{stat.outcome}</span>
                                                        <span className={`text-2xl font-black ${stat.color.text} group-hover/btn:scale-105 transition-transform drop-shadow`}>
                                                            {stat.odds}x
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.color.pill}`}>
                                                            {stat.pct}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            } else {
                                // MULTI-OPTION — 3 rows, avatar circle next to rank
                                const top3 = sortedStats.slice(0, 3);
                                const remainingCount = sortedStats.length - 3;

                                return (
                                    <div className="flex flex-col gap-1 mt-auto" style={{ minHeight: 100 }}>
                                        {top3.map((stat, idx) => {
                                            const imgSrc = outcomeImages?.[stat.outcome] || metadata?.outcome_images?.[stat.outcome] || '';
                                            return (
                                                <div key={stat.outcome} className="relative overflow-hidden bg-black/30 border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between hover:bg-white/[0.04] transition-colors flex-1">
                                                    {/* Progress bar */}
                                                    <div className={`absolute left-0 top-0 bottom-0 ${stat.color.bar} transition-all duration-700`} style={{ width: `${stat.pct}%` }} />
                                                    <div className="relative flex items-center gap-2 flex-1 min-w-0 pr-2">
                                                        <span className="text-gray-600 text-[10px] font-bold w-3 text-right flex-shrink-0">{idx + 1}</span>
                                                        {/* Avatar circle */}
                                                        {imgSrc ? (
                                                            <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                                                                <img src={imgSrc} alt={stat.outcome} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : null}
                                                        <span className="text-xs font-bold text-gray-200 truncate">{stat.outcome}</span>
                                                    </div>
                                                    <div className="relative flex items-center gap-2 flex-shrink-0">
                                                        <span className={`text-sm font-black ${stat.color.text}`}>{stat.odds}x</span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stat.color.pill}`}>{stat.pct}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {remainingCount > 0 && (
                                            <div className="text-center pt-0.5 text-[10px] uppercase font-bold text-gray-600">
                                                +{remainingCount} mais
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
