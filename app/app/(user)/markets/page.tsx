"use client";

import { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MarketCard from '@/components/MarketCard';

const categories = ["TODOS", "POLÍTICA", "ECONOMIA", "ESPORTE", "CRIPTO", "CLIMA"];

export default function MarketsPage() {
    const [markets, setMarkets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("TODOS");
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
        const matchesCategory = filter === "TODOS" || m.category === filter;
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
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`pb-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 px-1 ${filter === cat
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
                /* Grid */
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
            )}
        </div>
    );
}
