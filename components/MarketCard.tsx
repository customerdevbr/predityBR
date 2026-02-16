"use client";

import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    // Simple odds calc
    const safePool = pool > 0 ? pool : 1;
    const probYes = (yesAmount || 0) / safePool;
    const probNo = (noAmount || 0) / safePool;

    // Convert to % for bars
    const yesPct = Math.round(probYes * 100) || 50; // Default 50 if empty
    const noPct = Math.round(probNo * 100) || 50;

    const endsIn = formatDistanceToNow(new Date(endDate), { addSuffix: true, locale: ptBR });

    return (
        <Link href={`/markets/${id}`} className="block group">
            <div className="bg-surface/30 border border-surface hover:border-primary/50 rounded-xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col h-full">
                {/* Header / Image Area */}
                <div className="relative h-40 bg-gray-800">
                    {imageUrl ? (
                        <img src={imageUrl} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black text-gray-600 font-mono text-xs">
                            [IMG]
                        </div>
                    )}
                    <div className="absolute top-3 right-3">
                        <span className="px-2 py-1 bg-black/60 backdrop-blur border border-white/10 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                            {category}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col space-y-4">
                    <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">
                        {title}
                    </h3>

                    {/* Probability Bars */}
                    {/* Probability Bars */}
                    <div className="space-y-4">
                        {/* YES Row */}
                        <div className="flex items-center gap-3">
                            {/* Image (Left) */}
                            {metadata?.yes_image ? (
                                <img src={metadata.yes_image} alt="Sim" className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-surface border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-[10px] text-gray-500">
                                    S
                                </div>
                            )}

                            {/* Label + Bar (Right) */}
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between text-xs font-bold text-gray-400">
                                    <span className="text-primary">SIM</span>
                                    <span>{yesPct}%</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${yesPct}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* NO Row */}
                        <div className="flex items-center gap-3">
                            {/* Image (Left) */}
                            {metadata?.no_image ? (
                                <img src={metadata.no_image} alt="Não" className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-surface border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-[10px] text-gray-500">
                                    N
                                </div>
                            )}

                            {/* Label + Bar (Right) */}
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between text-xs font-bold text-gray-400">
                                    <span className="text-red-500">NÃO</span>
                                    <span>{noPct}%</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${noPct}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-auto pt-4 flex items-center justify-between text-xs text-gray-500 border-t border-white/5">
                        <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>R$ {pool.toLocaleString('pt-BR', { notation: "compact" })} Vol</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{endsIn}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
