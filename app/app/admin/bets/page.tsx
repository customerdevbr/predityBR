"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Search, Edit, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminBetsPage() {
    const [markets, setMarkets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetchMarkets();
    }, []);

    const fetchMarkets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('markets')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setMarkets(data);
        setLoading(false);
    };

    const handleDelete = async (market: any) => {
        // Safety: check for existing bets
        const { count } = await supabase
            .from('bets')
            .select('*', { count: 'exact', head: true })
            .eq('market_id', market.id);

        if ((count || 0) > 0) {
            alert(`Este mercado tem ${count} previsões registradas. Não é possível deletar.\nUse "Anular Mercado" na página de edição para estornar e cancelar.`);
            return;
        }

        if (!confirm(`Deletar permanentemente "${market.title}"?\n\nEsta ação não pode ser desfeita.`)) return;

        // Delete related data first (transactions, odds_history, etc)
        await supabase.from('odds_history').delete().eq('market_id', market.id);
        await supabase.from('transactions').delete().contains('metadata', { market_id: market.id });

        const { error } = await supabase
            .from('markets')
            .delete()
            .eq('id', market.id);

        if (error) {
            alert('Erro ao deletar: ' + error.message);
        } else {
            setMarkets(prev => prev.filter(m => m.id !== market.id));
        }
    };

    const filteredMarkets = markets.filter(m =>
        m.title.toLowerCase().includes(filter.toLowerCase()) ||
        m.id.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gerenciar Mercados</h1>
                    <p className="text-gray-400 text-sm">Crie, edite e resolva os mercados de previsões.</p>
                </div>
                <Link href="/app/admin/bets/new" className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> Novo Mercado
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-surface/30 border border-white/5 p-4 rounded-xl flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar por título ou ID..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                </div>
                <button onClick={fetchMarkets} className="px-4 py-2 bg-surface hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-gray-300">
                    Atualizar
                </button>
            </div>

            {/* Markets Table */}
            <div className="bg-surface/30 border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-surface/50 text-gray-400 font-medium uppercase tracking-wider">
                            <tr>
                                <th className="p-4">Título</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4">Pool Total</th>
                                <th className="p-4">Encerramento</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Carregando mercados...</td>
                                </tr>
                            ) : filteredMarkets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Nenhum mercado encontrado.</td>
                                </tr>
                            ) : (
                                filteredMarkets.map((market) => (
                                    <tr key={market.id} className="hover:bg-surface/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {market.image_url ? (
                                                    <img src={market.image_url} alt="" className="w-10 h-10 rounded object-cover bg-black/50" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded bg-surface border border-white/10 flex items-center justify-center text-xs text-gray-500">IMG</div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-white line-clamp-1 max-w-[200px]" title={market.title}>{market.title}</div>
                                                    <div className="text-xs text-gray-500 font-mono">ID: {market.id.substring(0, 8)}...</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${market.status === 'OPEN' ? 'bg-green-500/10 text-green-500' :
                                                market.status === 'RESOLVED' ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                {market.status === 'OPEN' ? 'Aberta' : market.status === 'RESOLVED' ? 'Resolvida' : 'Fechada'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-300">{market.category}</td>
                                        <td className="p-4 font-mono font-bold text-green-400">R$ {market.total_pool?.toFixed(2)}</td>
                                        <td className="p-4 text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(market.end_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/app/admin/bets/${market.id}`} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Editar">
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(market)}
                                                    className="p-2 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
                                                    title="Deletar mercado"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
