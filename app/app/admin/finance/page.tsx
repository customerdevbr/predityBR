"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import NotificationModal from '@/components/ui/NotificationModal';

export default function AdminFinancePage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalDeposits: 0,
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
        custodyBalance: 0
    });
    const [filter, setFilter] = useState('ALL'); // ALL, DEPOSIT, WITHDRAWAL, PENDING
    const [processing, setProcessing] = useState<string | null>(null);

    // Notification State
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'success'
    });

    useEffect(() => {
        fetchFinanceData();
    }, []);

    const fetchFinanceData = async () => {
        setLoading(true);

        // Fetch all transactions with user data
        const { data, error } = await supabase
            .from('transactions')
            .select('*, users(full_name, email)')
            .order('created_at', { ascending: false });

        if (data) {
            setTransactions(data);
            calculateStats(data);
        }
        setLoading(false);
    };

    const calculateStats = (data: any[]) => {
        const deposits = data.filter(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED').reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const withdrawals = data.filter(t => t.type === 'WITHDRAWAL' && t.status === 'COMPLETED').reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const pending = data.filter(t => t.type === 'WITHDRAWAL' && t.status === 'PENDING').reduce((acc, curr) => acc + (curr.amount || 0), 0);

        setStats({
            totalDeposits: deposits,
            totalWithdrawals: withdrawals,
            pendingWithdrawals: pending,
            custodyBalance: deposits - withdrawals
        });
    };

    const handleApproveWithdrawal = async (id: string) => {
        if (!confirm("Confirmar envio do PIX e marcar como PAGO?")) return;

        setProcessing(id);
        const { error } = await supabase
            .from('transactions')
            .update({ status: 'COMPLETED' })
            .eq('id', id);

        if (error) {
            setNotification({
                isOpen: true,
                title: 'Erro na Aprovação',
                message: error.message,
                type: 'error'
            });
        } else {
            // Update local state immediately to hide buttons
            setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, status: 'COMPLETED' } : tx));
            setNotification({
                isOpen: true,
                title: 'Pagamento Aprovado!',
                message: 'O saque foi marcado como concluído.',
                type: 'success'
            });
            fetchFinanceData(); // Refresh stats too
        }
        setProcessing(null);
    };

    const handleRejectWithdrawal = async (id: string, userId: string, amount: number) => {
        if (!confirm("Rejeitar saque e estornar valor para o usuário?")) return;

        setProcessing(id);
        // 1. Mark transaction as FAILED
        const { error: txError } = await supabase
            .from('transactions')
            .update({ status: 'FAILED' })
            .eq('id', id);

        if (txError) {
            setNotification({
                isOpen: true,
                title: 'Erro ao Rejeitar',
                message: txError.message,
                type: 'error'
            });
            setProcessing(null);
            return;
        }

        // 2. Refund User Balance
        const { error: userError } = await supabase.rpc('increment_balance', {
            userid: userId,
            amount: amount
        });

        if (userError) {
            console.warn("RPC increment_balance failed, trying manual fallback", userError);
            const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
            if (user) {
                await supabase.from('users').update({ balance: user.balance + amount }).eq('id', userId);
            }
        }

        setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, status: 'FAILED' } : tx));
        setNotification({
            isOpen: true,
            title: 'Saque Rejeitado',
            message: 'O valor foi estornado do saldo do usuário.',
            type: 'error'
        });
        fetchFinanceData();
        setProcessing(null);
    };

    const filteredTransactions = transactions.filter(t => {
        if (filter === 'ALL') return true;
        if (filter === 'PENDING') return t.status === 'PENDING';
        return t.type === filter;
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Financeiro</h1>
                <button onClick={fetchFinanceData} className="text-sm text-primary hover:text-primary/80">Atualizar</button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-surface/30 border border-surface p-6 rounded-xl">
                    <h3 className="text-gray-400 text-sm">Saldo em Custódia (Real)</h3>
                    <p className="text-2xl font-bold text-white mt-1">R$ {stats.custodyBalance.toFixed(2)}</p>
                </div>
                <div className="bg-surface/30 border border-surface p-6 rounded-xl">
                    <h3 className="text-gray-400 text-sm">Total Depositado</h3>
                    <p className="text-2xl font-bold text-green-400 mt-1">R$ {stats.totalDeposits.toFixed(2)}</p>
                </div>
                <div className="bg-surface/30 border border-surface p-6 rounded-xl">
                    <h3 className="text-gray-400 text-sm">Total Sacado</h3>
                    <p className="text-2xl font-bold text-red-400 mt-1">R$ {stats.totalWithdrawals.toFixed(2)}</p>
                </div>
                <div className="bg-surface/30 border border-surface p-6 rounded-xl">
                    <h3 className="text-gray-400 text-sm">Saques Pendentes</h3>
                    <p className="text-2xl font-bold text-yellow-400 mt-1">R$ {stats.pendingWithdrawals.toFixed(2)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'PENDING'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-surface/30 text-gray-400 hover:text-white'
                            }`}
                    >
                        {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Pendentes' : f === 'DEPOSIT' ? 'Depósitos' : 'Saques'}
                    </button>
                ))}
            </div>

            {/* Transactions Table */}
            <div className="bg-surface/30 border border-surface rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-surface/50 text-gray-400 font-medium">
                        <tr>
                            <th className="p-4">Data</th>
                            <th className="p-4">Usuário</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Valor</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                        ) : filteredTransactions.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                        ) : (
                            filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-gray-400">
                                        {format(new Date(tx.created_at), 'dd/MM HH:mm')}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-white mb-0.5">{tx.users?.full_name || 'Usuário'}</div>
                                        <div className="text-xs text-gray-500">{tx.users?.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'DEPOSIT' ? 'bg-green-500/20 text-green-400' :
                                            tx.type === 'WITHDRAWAL' ? 'bg-red-500/20 text-red-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-white">
                                        R$ {tx.amount.toFixed(2)}
                                    </td>
                                    <td className="p-4">
                                        {tx.status === 'PENDING' ? (
                                            <span className="flex items-center gap-1 text-yellow-500">
                                                <Clock className="w-3 h-3" /> Pendente
                                            </span>
                                        ) : tx.status === 'COMPLETED' ? (
                                            <span className="flex items-center gap-1 text-green-500">
                                                <CheckCircle className="w-3 h-3" /> Pago
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-500">
                                                <XCircle className="w-3 h-3" /> Cancelado
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {tx.type === 'WITHDRAWAL' && tx.status === 'PENDING' && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleApproveWithdrawal(tx.id)}
                                                    disabled={processing === tx.id}
                                                    className="p-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50"
                                                    title="Aprovar Pagamento"
                                                >
                                                    {processing === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleRejectWithdrawal(tx.id, tx.user_id, tx.amount)}
                                                    disabled={processing === tx.id}
                                                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50"
                                                    title="Rejeitar e Estornar"
                                                >
                                                    {processing === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        )}
                                        {tx.type === 'WITHDRAWAL' && tx.status !== 'PENDING' && (
                                            <span className={`text-xs font-bold uppercase ${tx.status === 'COMPLETED' ? 'text-green-500' : 'text-red-500'}`}>
                                                {tx.status === 'COMPLETED' ? 'Já Processado' : 'Cancelado'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <NotificationModal
                isOpen={notification.isOpen}
                onClose={() => setNotification({ ...notification, isOpen: false })}
                title={notification.title}
                message={notification.message}
                type={notification.type}
            />
        </div>
    );
}
