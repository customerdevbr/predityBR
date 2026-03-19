"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Activity, Users, TrendingUp, TrendingDown, Car, Bitcoin, RefreshCw } from 'lucide-react';

interface RoundRow {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    actual_count: number;
    target_count: number;
    rounded_count: number | null;
}

interface MarketRow {
    id: string;
    title: string;
    status: string;
    end_date: string;
    total_pool: number;
    outcome_pools: Record<string, number>;
    metadata: Record<string, any>;
    resolved_outcome: string | null;
    created_at: string;
}

interface MarketStats {
    market: MarketRow;
    round?: RoundRow;
    betsCount: number;
    winnersCount: number;
    losersCount: number;
    houseProfit: number;
}

export default function LiveMarketsPage() {
    const [vehicleStats, setVehicleStats] = useState<MarketStats[]>([]);
    const [btcStats, setBtcStats] = useState<MarketStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'vehicle' | 'btc'>('vehicle');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setRefreshing(true);

        // Busca mercados automáticos (últimos 50 de cada tipo)
        const { data: vehicleMarkets } = await supabase
            .from('markets')
            .select('*')
            .eq('metadata->>market_type', 'VEHICLE')
            .eq('metadata->>auto_market', 'true')
            .order('created_at', { ascending: false })
            .limit(50);

        const { data: btcMarkets } = await supabase
            .from('markets')
            .select('*')
            .eq('metadata->>market_type', 'BTC')
            .eq('metadata->>auto_market', 'true')
            .order('created_at', { ascending: false })
            .limit(50);

        // Busca todas as rodadas de veículos
        const { data: rounds } = await supabase
            .from('rounds')
            .select('*')
            .order('start_time', { ascending: false })
            .limit(100);

        const roundsMap: Record<string, RoundRow> = {};
        rounds?.forEach(r => { roundsMap[r.id] = r; });

        // Para cada mercado, busca contagem de bets e winners
        const allMarketIds = [
            ...(vehicleMarkets ?? []).map(m => m.id),
            ...(btcMarkets ?? []).map(m => m.id),
        ];

        const { data: betsData } = await supabase
            .from('bets')
            .select('market_id, outcome, amount, status')
            .in('market_id', allMarketIds);

        function buildStats(markets: MarketRow[]): MarketStats[] {
            return (markets ?? []).map(market => {
                const bets = betsData?.filter(b => b.market_id === market.id) ?? [];
                const betsCount = bets.length;
                const winnersCount = bets.filter(b => b.status === 'WON').length;
                const losersCount = bets.filter(b => b.status === 'LOST').length;
                // Lucro da casa = pool total × 5% (taxa da plataforma)
                const houseProfit = (market.total_pool ?? 0) * 0.05;
                const round = market.metadata?.round_id ? roundsMap[market.metadata.round_id] : undefined;
                return { market, round, betsCount, winnersCount, losersCount, houseProfit };
            });
        }

        setVehicleStats(buildStats(vehicleMarkets ?? []));
        setBtcStats(buildStats(btcMarkets ?? []));
        setLoading(false);
        setRefreshing(false);
    }

    const rows = tab === 'vehicle' ? vehicleStats : btcStats;

    const totalPool = rows.reduce((s, r) => s + (r.market.total_pool ?? 0), 0);
    const totalProfit = rows.reduce((s, r) => s + r.houseProfit, 0);
    const totalBets = rows.reduce((s, r) => s + r.betsCount, 0);
    const totalRounds = rows.length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Mercados Recorrentes</h1>
                <button
                    onClick={fetchData}
                    disabled={refreshing}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-surface/40 hover:bg-surface/60 border border-surface px-3 py-1.5 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>

            {/* Abas */}
            <div className="flex gap-2">
                <TabButton active={tab === 'vehicle'} onClick={() => setTab('vehicle')} icon={Car} label="Veículos" count={vehicleStats.length} />
                <TabButton active={tab === 'btc'} onClick={() => setTab('btc')} icon={Bitcoin} label="BTC" count={btcStats.length} />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Rodadas" value={totalRounds.toString()} icon={Activity} color="text-blue-400" />
                <KpiCard label="Pool Total" value={formatCurrency(totalPool)} icon={TrendingUp} color="text-green-400" />
                <KpiCard label="Apostas" value={totalBets.toString()} icon={Users} color="text-purple-400" />
                <KpiCard label="Lucro Casa (5%)" value={formatCurrency(totalProfit)} icon={TrendingDown} color="text-yellow-400" />
            </div>

            {/* Tabela */}
            {loading ? (
                <div className="h-40 flex items-center justify-center text-gray-500">Carregando...</div>
            ) : (
                <div className="bg-surface/30 border border-surface rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-gray-400 text-xs uppercase">
                                    <th className="p-4 text-left">Rodada / Mercado</th>
                                    {tab === 'vehicle' && <th className="p-4 text-center">Meta / Real</th>}
                                    {tab === 'btc' && <th className="p-4 text-center">Preço Abertura</th>}
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Apostas</th>
                                    <th className="p-4 text-center">Ganhou / Perdeu</th>
                                    <th className="p-4 text-right">Pool</th>
                                    <th className="p-4 text-right">Lucro Casa</th>
                                    <th className="p-4 text-right">Início</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">Nenhum mercado encontrado.</td></tr>
                                ) : rows.map(({ market, round, betsCount, winnersCount, losersCount, houseProfit }) => (
                                    <tr key={market.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="text-white font-medium truncate max-w-[220px]">
                                                {tab === 'vehicle'
                                                    ? (round ? `Rodada ${round.id.slice(-6).toUpperCase()}` : market.id.slice(-8).toUpperCase())
                                                    : `BTC ${format(new Date(market.created_at), 'dd/MM HH:mm', { locale: ptBR })}`
                                                }
                                            </div>
                                            <div className="text-gray-500 text-xs mt-0.5 font-mono">{market.id.slice(0, 8)}…</div>
                                        </td>

                                        {tab === 'vehicle' && (
                                            <td className="p-4 text-center">
                                                {round ? (
                                                    <span>
                                                        <span className="text-gray-400">{round.target_count}</span>
                                                        <span className="text-gray-600 mx-1">/</span>
                                                        <span className={round.actual_count > round.target_count ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                                            {round.actual_count}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600">—</span>
                                                )}
                                            </td>
                                        )}

                                        {tab === 'btc' && (
                                            <td className="p-4 text-center font-mono text-gray-300">
                                                ${market.metadata?.btc_open_price?.toLocaleString('en-US') ?? '—'}
                                            </td>
                                        )}

                                        <td className="p-4 text-center">
                                            <StatusBadge status={market.status} outcome={market.resolved_outcome} />
                                        </td>

                                        <td className="p-4 text-center text-gray-300 font-mono">{betsCount}</td>

                                        <td className="p-4 text-center">
                                            <span className="text-green-400 font-mono">{winnersCount}</span>
                                            <span className="text-gray-600 mx-1">/</span>
                                            <span className="text-red-400 font-mono">{losersCount}</span>
                                        </td>

                                        <td className="p-4 text-right font-mono text-gray-200">
                                            {formatCurrency(market.total_pool ?? 0)}
                                        </td>

                                        <td className="p-4 text-right font-mono text-yellow-400">
                                            {formatCurrency(houseProfit)}
                                        </td>

                                        <td className="p-4 text-right text-gray-500 text-xs">
                                            {format(new Date(market.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: any; label: string; count: number }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                    ? 'bg-primary text-black'
                    : 'bg-surface/30 text-gray-400 hover:text-white border border-surface'
            }`}
        >
            <Icon className="w-4 h-4" />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-black/20' : 'bg-surface'}`}>{count}</span>
        </button>
    );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
    return (
        <div className="bg-surface/30 border border-surface rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-surface rounded-lg">
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
                <div className="text-gray-400 text-xs">{label}</div>
                <div className="text-white font-bold text-lg">{value}</div>
            </div>
        </div>
    );
}

function StatusBadge({ status, outcome }: { status: string; outcome: string | null }) {
    if (status === 'OPEN') return <span className="text-blue-400 bg-blue-400/10 text-xs px-2 py-0.5 rounded-full">Aberto</span>;
    if (status === 'RESOLVED') {
        const color = outcome === 'MAIS' || outcome === 'SUBIU' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10';
        return <span className={`${color} text-xs px-2 py-0.5 rounded-full`}>{outcome}</span>;
    }
    if (status === 'VOIDED') return <span className="text-gray-400 bg-gray-400/10 text-xs px-2 py-0.5 rounded-full">Cancelado</span>;
    return <span className="text-gray-500 text-xs px-2 py-0.5 rounded-full border border-surface">{status}</span>;
}
