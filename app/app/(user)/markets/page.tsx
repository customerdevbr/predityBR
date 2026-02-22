"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, Flame, Clock as ClockIcon, TrendingUp, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MarketCard from '@/components/MarketCard';

const categories = ["TODOS", "POLÍTICA", "ECONOMIA", "ESPORTE", "CRIPTO", "CLIMA"];

export default function MarketsPage() {
    const [markets, setMarkets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("INÍCIO");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchMarkets();
    }, []);

    const fetchMarkets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('markets')
            .select('*')
            .order('end_date', { ascending: true });

        if (error) {
            console.error('Error fetching markets:', error);
        } else {
            setMarkets(data || []);
        }
        setLoading(false);
    };

    const filteredMarkets = markets.filter(m => {
        const matchesCategory = activeTab === "TODAS" || activeTab === "INÍCIO" || m.category === activeTab;
        const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-8">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold">Mercados</h1>
                    <p className="text-gray-400">Explore e negocie em eventos globais.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-surface border border-surface rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-white placeholder-gray-500"
                        />
                    </div>
                </div>
            </div>

            {/* Categories Tabs */}
            <div className="border-b border-surface">
                <div className="flex gap-6 overflow-x-auto pb-px scrollbar-hide">
                    {["INÍCIO", "TODAS", "POLÍTICA", "ECONOMIA", "ESPORTE", "CRIPTO", "CLIMA"].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            className={`pb-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 px-1 ${activeTab === cat
                                ? "border-primary text-primary"
                                : "border-transparent text-gray-400 hover:text-white"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-80 bg-surface/30 rounded-xl"></div>
                    ))}
                </div>
            ) : (
                /* Grid ou Carrossel Dependendo da Aba e da Busca */
                search.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMarkets.map((market) => (
                            <MarketCard
                                key={market.id}
                                id={market.id}
                                title={market.title}
                                category={market.category}
                                imageUrl={market.image_url}
                                endDate={market.end_date}
                                pool={market.total_pool || 0}
                                yesAmount={market.total_yes_amount || 0}
                                noAmount={market.total_no_amount || 0}
                                outcomes={market.outcomes}
                                outcomePools={market.outcome_pools}
                                metadata={market.metadata}
                                slug={market.slug}
                            />
                        ))}
                        {filteredMarkets.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <div className="bg-surface/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Filter className="w-8 h-8 text-gray-500" />
                                </div>
                                <h3 className="text-lg font-bold">Nenhum mercado encontrado</h3>
                                <p className="text-gray-400">Tente ajustar seus filtros de busca.</p>
                            </div>
                        )}
                    </div>
                ) : activeTab === "INÍCIO" ? (
                    <div className="space-y-10">
                        {/* Em Alta */}
                        <div>
                            <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 text-xl shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                    🔥
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">Em Alta <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{markets.length} mercados</span></h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Mercados recém abertos com grande potencial.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide">
                                {markets.slice(0, 10).map(m => (
                                    <div key={m.id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] snap-start flex-shrink-0">
                                        <MarketCard {...m} pool={m.total_pool || 0} yesAmount={m.total_yes_amount || 0} noAmount={m.total_no_amount || 0} imageUrl={m.image_url} endDate={m.end_date} verticalLayout={true} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Encerra em Breve */}
                        {markets.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 text-xl shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                        ⏳
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">Encerra em Breve <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Corra</span></h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Última chance para dar o seu palpite.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide">
                                    {[...markets].sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()).slice(0, 10).map(m => (
                                        <div key={m.id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] snap-start flex-shrink-0">
                                            <MarketCard {...m} pool={m.total_pool || 0} yesAmount={m.total_yes_amount || 0} noAmount={m.total_no_amount || 0} imageUrl={m.image_url} endDate={m.end_date} verticalLayout={true} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Maior Volume */}
                        {markets.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-xl shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                        📈
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">Maior Volume 24h <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Top</span></h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Onde a comunidade está colocando mais dinheiro.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide">
                                    {[...markets].sort((a, b) => (b.total_pool || 0) - (a.total_pool || 0)).slice(0, 10).map(m => (
                                        <div key={m.id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] snap-start flex-shrink-0">
                                            <MarketCard {...m} pool={m.total_pool || 0} yesAmount={m.total_yes_amount || 0} noAmount={m.total_no_amount || 0} imageUrl={m.image_url} endDate={m.end_date} verticalLayout={true} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Demais Categorias */}
                        {["POLÍTICA", "ECONOMIA", "ESPORTE", "CRIPTO", "CLIMA"].map(cat => {
                            const catMarkets = markets.filter(m => m.category === cat);
                            if (catMarkets.length === 0) return null;

                            let catEmoji = "🌐";
                            if (cat === "POLÍTICA") catEmoji = "🏛️";
                            if (cat === "ESPORTE") catEmoji = "⚽";
                            if (cat === "ECONOMIA") catEmoji = "💰";
                            if (cat === "CRIPTO") catEmoji = "₿";
                            if (cat === "CLIMA") catEmoji = "☀️";

                            return (
                                <div key={cat}>
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xl shadow-[0_0_15px_rgba(47,124,70,0.3)]">
                                            {catEmoji}
                                        </div>
                                        <div className="flex-1 flex justify-between items-center pr-2">
                                            <div>
                                                <h2 className="text-lg font-bold text-white flex items-center gap-2">{cat} <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{catMarkets.length} mercados</span></h2>
                                            </div>
                                            <button onClick={() => setActiveTab(cat)} className="text-xs font-bold flex items-center gap-1 text-primary hover:text-white transition-colors">
                                                Ver Todos <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide">
                                        {catMarkets.map(m => (
                                            <div key={m.id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] snap-start flex-shrink-0">
                                                <MarketCard {...m} pool={m.total_pool || 0} yesAmount={m.total_yes_amount || 0} noAmount={m.total_no_amount || 0} imageUrl={m.image_url} endDate={m.end_date} verticalLayout={true} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMarkets.filter(m => activeTab === "TODAS" || m.category === activeTab).map((market) => (
                            <MarketCard
                                key={market.id}
                                id={market.id}
                                title={market.title}
                                category={market.category}
                                imageUrl={market.image_url}
                                endDate={market.end_date}
                                pool={market.total_pool || 0}
                                yesAmount={market.total_yes_amount || 0}
                                noAmount={market.total_no_amount || 0}
                                outcomes={market.outcomes}
                                outcomePools={market.outcome_pools}
                                metadata={market.metadata}
                                slug={market.slug}
                            />
                        ))}
                        {filteredMarkets.filter(m => activeTab === "TODAS" || m.category === activeTab).length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-500 bg-surface/30 rounded-xl border border-white/5">
                                Nenhum mercado aberto para esta categoria no momento.
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
}
