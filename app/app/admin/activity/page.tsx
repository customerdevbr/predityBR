"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, ArrowUpRight, ArrowDownLeft, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

export default function AdminActivityPage() {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivity();
    }, []);

    const fetchActivity = async () => {
        setLoading(true);
        // Fetch recent transactions as "Activity"
        const { data, error } = await supabase
            .from('transactions')
            .select('*, users(full_name, email)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) console.error(error);
        if (data) setActivities(data);
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Atividades Recentes</h1>

            <div className="bg-surface/30 border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-surface/50 text-gray-400 font-medium uppercase tracking-wider">
                            <tr>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Descrição</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4">Data</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Carregando atividades...</td></tr>
                            ) : activities.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhuma atividade recente.</td></tr>
                            ) : (
                                activities.map((item) => (
                                    <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                                        <td className="p-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.type === 'DEPOSIT' || item.type === 'WIN' ? 'bg-green-500/20 text-green-500' : 'bg-surface border border-white/10 text-gray-400'
                                                }`}>
                                                {item.type === 'DEPOSIT' ? <ArrowDownLeft className="w-4 h-4" /> :
                                                    item.type === 'WIN' ? <ArrowDownLeft className="w-4 h-4" /> :
                                                        <ArrowUpRight className="w-4 h-4" />}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-white">{item.users?.full_name || 'Usuário Desconhecido'}</div>
                                            <div className="text-xs text-gray-500">{item.users?.email}</div>
                                        </td>
                                        <td className="p-4 text-gray-300">{item.description || item.type}</td>
                                        <td className="p-4 font-mono font-bold text-white">
                                            {formatCurrency(item.amount)}
                                        </td>
                                        <td className="p-4 text-gray-500 text-xs">
                                            {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                        </td>
                                        <td className="p-4">
                                            {item.status === 'COMPLETED' ? (
                                                <span className="flex items-center gap-1 text-green-500 text-xs font-bold uppercase">
                                                    <CheckCircle className="w-3 h-3" /> Concluído
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-yellow-500 text-xs font-bold uppercase">
                                                    <Clock className="w-3 h-3" /> Pendente
                                                </span>
                                            )}
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
