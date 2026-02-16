"use client";

import { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users } from 'lucide-react';

interface HeroCardStackProps {
    cards: any[];
}

export default function HeroCardStack({ cards }: HeroCardStackProps) {
    const [activeCardIndex, setActiveCardIndex] = useState(0);
    const [ticker, setTicker] = useState<{ id: number, value: number, top: number, left: number }[]>([]);

    // Rotate cards
    useEffect(() => {
        if (cards.length === 0) return;
        const interval = setInterval(() => {
            setActiveCardIndex((prev) => (prev + 1) % cards.length);
        }, 5000); // Slower rotation to appreciate the charts
        return () => clearInterval(interval);
    }, [cards.length]);

    // Live Ticker Effect (Simulate bets)
    useEffect(() => {
        const interval = setInterval(() => {
            const id = Date.now();
            const value = Math.floor(Math.random() * 400) + 50; // R$ 50 - 450
            const top = Math.random() * 60 + 20; // 20% - 80% height
            const left = Math.random() * 80 + 10; // 10% - 90% width

            setTicker(prev => [...prev.slice(-5), { id, value, top, left }]);

            setTimeout(() => {
                setTicker(prev => prev.filter(t => t.id !== id));
            }, 2000); // Remove after 2s
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const [liveCards, setLiveCards] = useState(cards);

    // Sync props to state (initial load)
    useEffect(() => {
        setLiveCards(cards);
    }, [cards]);

    // Live Odds Oscillation
    useEffect(() => {
        const interval = setInterval(() => {
            setLiveCards(prevCards => prevCards.map(card => {
                // Determine if this card should update (30% chance)
                if (Math.random() > 0.3) return card;

                // Fluctuate odds by +/- 0.05
                const fluctuation = (Math.random() * 0.1) - 0.05;
                let newYes = card.yes + fluctuation;
                let newNo = card.no - fluctuation; // Inverse correlation (approx)

                // Clamp values
                if (newYes < 1.01) newYes = 1.01;
                if (newNo < 1.01) newNo = 1.01;

                return {
                    ...card,
                    yes: newYes,
                    no: newNo
                };
            }));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Mock Chart Data Generator (Since we don't have real historical data yet)
    const generateChartData = () => {
        return Array.from({ length: 20 }, (_, i) => ({
            value: 50 + Math.random() * 30 + (i * 2) // Slight upward trend
        }));
    };

    const data = generateChartData();

    return (
        <div className="relative w-full max-w-sm h-80">
            {liveCards.length > 0 ? liveCards.map((card, index) => {
                let offset = (index - activeCardIndex + liveCards.length) % liveCards.length;
                const isActive = offset === 0;
                const isNext = offset === 1;
                const isPrev = offset === 2;

                if (liveCards.length > 3 && !isActive && !isNext && !isPrev) return null;

                return (
                    <div
                        key={card.id}
                        className={`absolute top-0 left-0 w-full bg-[#181a1f] border border-white/10 rounded-2xl p-6 shadow-2xl transition-all duration-700 ease-out select-none overflow-hidden ${isActive
                            ? 'z-30 opacity-100 scale-100 translate-y-0 rotate-0 border-primary/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                            : isNext
                                ? 'z-20 opacity-40 scale-95 translate-y-6 rotate-2 grayscale'
                                : 'z-10 opacity-20 scale-90 translate-y-12 rotate-4 grayscale'
                            }`}
                    >
                        {/* Background Chart (Subtle) */}
                        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id={`grad${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="value" stroke="#22c55e" fillOpacity={1} fill={`url(#grad${index})`} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Live Ticker Bubbles */}
                        {isActive && ticker.map(t => (
                            <div
                                key={t.id}
                                className="absolute z-50 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg animate-[float_2s_ease-out_forwards] pointer-events-none"
                                style={{ top: `${t.top}%`, left: `${t.left}%` }}
                            >
                                +R$ {t.value}
                            </div>
                        ))}

                        <div className="relative z-10 flex flex-col h-full">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold text-gray-400 uppercase tracking-wider border border-white/5">
                                    {card.category}
                                </span>
                                <div className="flex items-center gap-1 text-red-400 animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                    <span className="text-[10px] font-bold uppercase">Ao Vivo</span>
                                </div>
                            </div>

                            {/* Title */}
                            <h4 className="text-xl font-black text-white leading-tight mb-6 line-clamp-3">
                                {card.title}
                            </h4>

                            {/* Big Odds Display */}
                            <div className="mt-auto grid grid-cols-2 gap-4">
                                {/* YES Button */}
                                <div className="group relative bg-[#1E293B] hover:bg-[#22c55e] border border-white/10 hover:border-[#22c55e] p-3 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="relative z-10 text-center">
                                        <div className="text-xs font-bold text-gray-400 group-hover:text-white/80 mb-1">SIM</div>
                                        <div className="text-2xl font-black text-[#22c55e] group-hover:text-white">
                                            {card.yes.toFixed(2)}x
                                        </div>
                                    </div>
                                </div>

                                {/* NO Button */}
                                <div className="group relative bg-[#1E293B] hover:bg-[#ef4444] border border-white/10 hover:border-[#ef4444] p-3 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="relative z-10 text-center">
                                        <div className="text-xs font-bold text-gray-400 group-hover:text-white/80 mb-1">NÃO</div>
                                        <div className="text-2xl font-black text-[#ef4444] group-hover:text-white">
                                            {card.no.toFixed(2)}x
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }) : (
                <div className="absolute top-0 left-0 w-full h-full bg-[#181a1f] border border-white/10 rounded-2xl flex items-center justify-center">
                    <p className="text-gray-500 animate-pulse">Carregando oportunidades...</p>
                </div>
            )}

            <style jsx>{`
                @keyframes float {
                    0% { transform: translateY(0) scale(0.8); opacity: 0; }
                    20% { transform: translateY(-10px) scale(1.1); opacity: 1; }
                    100% { transform: translateY(-40px) scale(1); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
