"use client";

import Link from 'next/link';
import { Clock, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
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
    metadata?: any;
}

export default function MarketCard({ id, title, category, imageUrl, endDate, pool, yesAmount, noAmount, metadata }: MarketCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [ticker, setTicker] = useState<{ id: number, value: number, type: 'yes' | 'no', top: number, left: number }[]>([]);

    // Odds Calculation
    const safePool = pool > 0 ? pool : 1;
    const probYes = (yesAmount || 0) / safePool;
    // const probNo = (noAmount || 0) / safePool; // Unused
    const yesPct = Math.round(probYes * 100) || 50;

    // Synthetic Chart Data (Generate a trend leading to current pct)
    const [chartData] = useState(() => {
        const points = 20;
        const data = [];
        let currentValue = yesPct;
        // Generate backwards
        for (let i = 0; i < points; i++) {
            data.unshift({ value: currentValue });
            // Random walk
            currentValue = currentValue + (Math.random() * 10 - 5);
            if (currentValue < 5) currentValue = 5;
            if (currentValue > 95) currentValue = 95;
        }
        return data;
    });

    // Time Remaining Logic
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = differenceInDays(end, now);
    const timeDisplay = formatDistanceToNow(end, { locale: ptBR, addSuffix: false });
    const isUrgent = daysLeft < 2;

    // Live Ticker Effect (Simulate bets when hovered)
    useEffect(() => {
        // if (!isHovered) return; // Optional: only tick on hover? Let's make it always alive for "em alta"

        const interval = setInterval(() => {
            if (Math.random() > 0.4) return; // 60% chance to skip (don't spam)

            const id = Date.now();
            const value = Math.floor(Math.random() * 200) + 10;
            const type = Math.random() > 0.5 ? 'yes' : 'no';
            const top = Math.random() * 60 + 20;
            const left = Math.random() * 80 + 10;

            setTicker(prev => [...prev.slice(-3), { id, value, type, top, left }]);

            setTimeout(() => {
                setTicker(prev => prev.filter(t => t.id !== id));
            }, 1500);
        }, 2000);

        return () => clearInterval(interval);
    }, [isHovered]);

    return (
        <Link
            href={`/app/markets/${id}`}
            className="block group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="bg-[#151921] border border-white/5 hover:border-primary/50 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,197,94,0.1)] flex flex-col h-full relative">

                {/* Header / Image (Compact) */}
                <div className="relative h-32 bg-gray-800 overflow-hidden">
                    {imageUrl ? (
                        <img src={imageUrl} alt={title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-700 group-hover:scale-105" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black"></div>
                    )}

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 bg-black/60 backdrop-blur border border-white/10 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                            {category}
                        </span>
                    </div>

                    {/* Timer Badge (Prominent) */}
                    <div className={`absolute bottom-3 right-3 px-2 py-1 rounded backdrop-blur border flex items-center gap-1.5 shadow-lg ${isUrgent ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-black/60 border-white/10 text-gray-300'}`}>
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-bold uppercase">{timeDisplay}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col relative">
                    {/* Background Chart Overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-24 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id={`gradChart-${id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={yesPct >= 50 ? "#22c55e" : "#ef4444"} stopOpacity={0.5} />
                                        <stop offset="95%" stopColor={yesPct >= 50 ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={yesPct >= 50 ? "#22c55e" : "#ef4444"}
                                    strokeWidth={2}
                                    fill={`url(#gradChart-${id})`}
                                />
                                <YAxis domain={[0, 100]} hide />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Live Ticker Bubbles */}
                    {ticker.map(t => (
                        <div
                            key={t.id}
                            className={`absolute z-20 px-2 py-0.5 text-[10px] font-bold rounded-full shadow-lg animate-[float_1.5s_ease-out_forwards] pointer-events-none border ${t.type === 'yes' ? 'bg-green-500/90 text-white border-green-400' : 'bg-red-500/90 text-white border-red-400'}`}
                            style={{ top: `${t.top}%`, left: `${t.left}%` }}
                        >
                            {t.type === 'yes' ? 'SIM' : 'NÃO'} +R${t.value}
                        </div>
                    ))}

                    <h3 className="text-base font-bold leading-tight text-gray-100 group-hover:text-primary transition-colors line-clamp-2 min-h-[3rem] z-10 mb-4">
                        {title}
                    </h3>

                    <div className="mt-auto grid grid-cols-2 gap-2 z-10">
                        {/* YES Stat */}
                        <div className="bg-surface/50 border border-white/5 rounded-lg p-2 flex flex-col items-center justify-center group-hover:border-green-500/30 transition-colors">
                            <span className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Probabilidade</span>
                            <div className="text-xl font-black text-green-500 flex items-center gap-1">
                                {yesPct}%
                                <ArrowUpRight className="w-3 h-3 text-green-500/50" />
                            </div>
                        </div>

                        {/* POOL Stat */}
                        <div className="bg-surface/50 border border-white/5 rounded-lg p-2 flex flex-col items-center justify-center group-hover:border-primary/30 transition-colors">
                            <span className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Volume</span>
                            <div className="text-lg font-bold text-white flex items-center gap-1">
                                R$ {pool.toLocaleString('pt-BR', { notation: "compact" })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes float {
                    0% { transform: translateY(0) scale(0.8); opacity: 0; }
                    20% { transform: translateY(-10px) scale(1); opacity: 1; }
                    100% { transform: translateY(-30px) scale(0.9); opacity: 0; }
                }
            `}</style>
        </Link>
    );
}
