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
}

export default function MarketCard({ id, title, category, imageUrl, endDate, pool, yesAmount, noAmount, outcomes, outcomePools, metadata }: MarketCardProps) {
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
    const safePool = currentPool > 0 ? currentPool : 2;
    const safeYes = currentYes > 0 ? currentYes : 1;
    const safeNo = currentNo > 0 ? currentNo : 1;

    const probYes = safeYes / safePool;
    const probNo = safeNo / safePool;

    // Odds (Payout Multiplier)
    const oddsYes = (safePool / safeYes).toFixed(2);
    const oddsNo = (safePool / safeNo).toFixed(2);

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
            href={`/app/markets/${id}`}
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

                    {/* Odds & Buttons - The "Meat" of the card */}
                    {/* Odds & Buttons - Dynamic Outcomes */}
                    <div className="relative z-10 mt-auto grid grid-cols-2 gap-3">
                        {/* Dynamic Outcomes Mapping */}
                        {(outcomes && outcomes.length > 0 ? outcomes : ['SIM', 'NÃO']).slice(0, 4).map((outcome) => {
                            // Logic to get pool for this specific outcome
                            let amount = currentOutcomePools ? currentOutcomePools[outcome] || 0 : 0;

                            // Fallback for Legacy Yes/No if pools are missing
                            if (!currentOutcomePools) {
                                if ((outcome === 'SIM' || outcome === 'YES') && currentYes) amount = currentYes;
                                if ((outcome === 'NÃO' || outcome === 'NO') && currentNo) amount = currentNo;
                            }

                            // Safe math
                            const safeAmount = amount > 0 ? amount : 1;
                            // Calculate Odds: Pool / OutcomeAmount. If outcome is huge, odds are low (1.01).
                            const oddsVal = (safePool / safeAmount);
                            const odds = (oddsVal < 1.01 ? 1.01 : oddsVal).toFixed(2);
                            const pct = Math.round((safeAmount / safePool) * 100) || 0;

                            // Color Logic
                            let colors = 'border-gray-500/20 hover:border-gray-500 text-gray-500';
                            let textColors = 'text-gray-400';

                            const norm = outcome.toUpperCase();
                            if (norm === 'SIM' || norm === 'YES') {
                                colors = 'border-green-500/20 hover:border-green-500';
                                textColors = 'text-green-500';
                            } else if (norm === 'NÃO' || norm === 'NO') {
                                colors = 'border-red-500/20 hover:border-red-500';
                                textColors = 'text-red-500';
                            } else {
                                colors = 'border-blue-500/20 hover:border-blue-500';
                                textColors = 'text-blue-500';
                            }

                            return (
                                <div key={outcome} className={`bg-[#1E2530] hover:bg-[#1E2530]/80 border ${colors} rounded-lg p-2 text-center transition-all group/btn`}>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 truncate px-1" title={outcome}>{outcome}</div>
                                    <div className={`text-2xl font-black ${textColors} group-hover/btn:scale-110 transition-transform`}>
                                        {odds}x
                                    </div>
                                    <div className="text-[10px] text-gray-500">{pct}%</div>
                                </div>
                            );
                        })}
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
