"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChevronDown, ArrowRight, FileText, Wallet, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function WalletPage() {
    const [balance, setBalance] = useState(0);
    const [bets, setBets] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        setUser(session.user);

        // Fetch Balance
        const { data: userData } = await supabase.from('users').select('balance').eq('id', session.user.id).single();
        if (userData) setBalance(userData.balance);

        // Fetch Bets (Predictions) with Market Stats for Cashout
        const { data: userBets } = await supabase
            .from('bets')
            .select('*, markets(title, status, total_pool, total_yes_amount, total_no_amount)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (userBets) setBets(userBets);

        // Fetch Transactions
        const { data: txs } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (txs) setTransactions(txs);

        setLoading(false);
    };

    const calculateCashout = (bet: any) => {
        if (!bet.markets) return 0;
        if (bet.status !== 'ACTIVE') return 0;
        if (bet.markets.status !== 'OPEN') return 0;

        const pool = bet.markets.total_pool || 1;
        // Probability of winning based on current pool ratio
        // If I bet YES, I own YES shares. Value depends on (YES Pool / Total Pool)?
        // No, current price of YES is (YES / POOL)? Wait.
        // In Parimutuel/Pool:
        // Payout = (MyAmount / TotalYes) * TotalPool
        // If I cashout, I am effectively selling "MyAmount" of YES.
        // The "Price" is roughly what 1 unit of YES is worth now.
        // 1 unit of YES pays (1 / Prob). 
        // Let's stick to the simpler formula used in calculation earlier:
        // Value ~= PotentialPayout * CurrentProbability * (1 - Fee)

        // Current Probability (Implied by Pool):
        const sidePool = bet.side === 'YES' ? bet.markets.total_yes_amount : bet.markets.total_no_amount;
        const prob = (sidePool || 0) / pool;

        // Note: Check logic. If I bet YES, and YES pool is huge, does it mean YES is likely? 
        // In this simple pool: Yes. More money in YES = Higher Probability.
        // So `prob = sidePool / pool`.

        const cashoutValue = (bet.potential_payout || 0) * prob * 0.90; // 10% fee
        return cashoutValue;
    };

    const handleCashout = async (bet: any) => {
        const value = calculateCashout(bet);
        if (value <= 0) return;

        if (!confirm(`Deseja encerrar esta aposta por R$ ${value.toFixed(2)}?`)) return;

        setProcessing(bet.id);

        try {
            // 1. Update Bet Status
            const { error: betError } = await supabase
                .from('bets')
                .update({
                    status: 'CASHED_OUT',
                    payout: value
                })
                .eq('id', bet.id);

            if (betError) throw betError;

            // 2. Update User Balance
            // Note: Ideally use RPC for atomicity, but client side for now
            // Need to fetch fresh balance first to be safe? Or just increment local known.
            // Using RPC increment is safer if available, but simple update for prototype.
            const { data: freshUser } = await supabase.from('users').select('balance').eq('id', user.id).single();
            const newBalance = (freshUser?.balance || balance) + value;

            const { error: balError } = await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('id', user.id);

            if (balError) throw balError;

            // 3. Log Transaction
            await supabase.from('transactions').insert({
                user_id: user.id,
                type: 'CASHOUT',
                amount: value,
                status: 'COMPLETED',
                description: `Cashout: ${bet.markets.title}`
            });

            alert("Cashout realizado com sucesso!");
            fetchWalletData();

        } catch (err: any) {
            console.error(err);
            alert("Erro ao realizar cashout: " + err.message);
        } finally {
            setProcessing(null);
        }
    };

    const handleDeposit = async () => {
        const amount = prompt("Valor para depósito (Simulação PIX):", "100");
        if (!amount) return;
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) return;

        // Mock deposit
        const newBalance = balance + val;
        await supabase.from('users').update({ balance: newBalance }).eq('id', user.id);

        // Log tx
        await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'DEPOSIT',
            amount: val,
            status: 'COMPLETED',
            provider: 'MOCK_PIX'
        });

        fetchWalletData();
        alert("Depósito realizado!");
    };

    const handleWithdraw = () => {
        alert("Saques em manutenção.");
    };

    const filteredBets = bets.filter(bet => {
        const isClosed = bet.status === 'RESOLVED' || bet.status === 'CLOSED' || bet.status === 'CASHED_OUT';
        return activeTab === 'CLOSED' ? isClosed : !isClosed;
    });

    if (loading) return <div className="min-h-screen pt-20 flex justify-center text-primary">Carregando...</div>;

    return (
        <div className="max-w-md mx-auto pb-40 space-y-6">

            {/* Accordion / Info Header */}
            <div className="bg-surface rounded-lg p-4 flex items-center justify-between cursor-pointer border border-white/5">
                <span className="font-medium text-gray-300">Sobre os saldos e posições</span>
                <ChevronDown className="text-gray-500 w-5 h-5" />
            </div>

            {/* My Predictions Header */}
            <div className="bg-[#151921] rounded-xl p-6 border border-white/5 space-y-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-gray-200">Minhas previsões</h2>
                    <div className="flex items-center gap-2 text-sm text-green-500 font-mono">
                        <span>R$ {bets.filter(b => b.status === 'ACTIVE').reduce((acc, b) => acc + (b.potential_payout || 0), 0).toFixed(2)} (Potencial)</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-black/30 p-1 rounded-lg flex">
                    <button
                        onClick={() => setActiveTab('OPEN')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'OPEN' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Em aberto
                    </button>
                    <button
                        onClick={() => setActiveTab('CLOSED')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'CLOSED' ? 'bg-surface text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                        Encerrados
                    </button>
                </div>

                {/* Content List */}
                <div className="min-h-[150px] bg-black/20 rounded-lg flex items-center justify-center border border-white/5">
                    {filteredBets.length > 0 ? (
                        <div className="w-full">
                            {filteredBets.map(bet => {
                                const cashoutVal = calculateCashout(bet);
                                const isCashable = activeTab === 'OPEN' && bet.status === 'ACTIVE' && cashoutVal > 0;

                                return (
                                    <div key={bet.id} className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 w-full bg-black">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-sm font-bold truncate text-white block">{bet.markets?.title || 'Mercado'}</p>
                                                <p className="text-xs text-gray-500">{bet.side === 'YES' ? 'SIM' : 'NÃO'} • {format(new Date(bet.created_at), 'dd/MM HH:mm')}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-sm font-bold text-gray-300">R$ {bet.amount}</span>
                                                <span className="block text-[10px] text-green-500">Potencial: R$ {bet.potential_payout?.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Cashout Action */}
                                        {isCashable && (
                                            <div className="flex items-center justify-end pt-2 border-t border-white/5 mt-2">
                                                <button
                                                    onClick={() => handleCashout(bet)}
                                                    disabled={processing === bet.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-surface border border-primary/30 rounded text-xs font-bold text-primary transition-colors disabled:opacity-50"
                                                >
                                                    {processing === bet.id ? 'Processando...' : `Encerrar: R$ ${cashoutVal.toFixed(2)}`}
                                                </button>
                                            </div>
                                        )}

                                        {bet.status === 'CASHED_OUT' && (
                                            <div className="flex justify-end pt-2 border-t border-white/5 mt-2">
                                                <span className="text-xs font-bold text-orange-400">Encerrado: R$ {bet.payout?.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-6 text-center">
                            <p className="text-gray-500 text-sm">Nenhum ativo encontrado.</p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <button
                        onClick={handleDeposit}
                        className="py-3 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white font-bold text-sm transition-all uppercase tracking-wide"
                    >
                        Depositar
                    </button>
                    <button
                        onClick={handleWithdraw}
                        className="py-3 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 font-bold text-sm transition-all uppercase tracking-wide"
                    >
                        Sacar
                    </button>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-[#151921] rounded-xl p-6 border border-white/5 min-h-[200px] flex flex-col">
                <h3 className="text-sm font-bold text-gray-400 mb-6 sticky top-0">Histórico de Transações</h3>

                {transactions.length > 0 ? (
                    <div className="space-y-4">
                        {transactions.map(tx => (
                            <div key={tx.id} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'CASHOUT' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                        <Wallet className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">
                                            {tx.type === 'DEPOSIT' ? 'Depósito' :
                                                tx.type === 'CASHOUT' ? 'Cashout' :
                                                    tx.type === 'WIN' ? 'Vitória' : 'Saque'}
                                        </p>
                                        <p className="text-xs text-gray-500">{format(new Date(tx.created_at), 'dd/MM/yyyy')}</p>
                                    </div>
                                </div>
                                <span className={`font-bold ${tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'CASHOUT' ? 'text-green-500' : 'text-red-500'}`}>
                                    {tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'CASHOUT' ? '+' : '-'} R$ {tx.amount}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-2 opacity-50">
                        <FileText className="w-10 h-10 mb-2" />
                        <span className="font-bold">Nenhum registro encontrado</span>
                        <span className="text-xs text-center max-w-[200px]">Você ainda não possui transações registradas em seu extrato.</span>
                    </div>
                )}
            </div>
        </div>
    );
}
