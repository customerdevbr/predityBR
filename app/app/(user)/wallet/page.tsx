"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ArrowDownLeft, History, Wallet as WalletIcon, X, Copy, CheckCircle, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WalletPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [bets, setBets] = useState<any[]>([]);
    const [tab, setTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
    const [processing, setProcessing] = useState<string | null>(null);

    // Deposit Modal State
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [depositStep, setDepositStep] = useState(1); // 1: Amount, 2: PIX
    const [depositAmount, setDepositAmount] = useState<string>('');
    const [pixKey] = useState("00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540410.005802BR5913Predity Pagamentos6008Brasilia62070503***6304E2CA");

    // Withdrawal Modal State
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [withdrawPixKey, setWithdrawPixKey] = useState('');

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
        } else {
            setUser(session.user);
            fetchWalletData(session.user.id);
        }
    };

    const fetchWalletData = async (userId: string = user?.id) => {
        if (!userId) return;
        setLoading(true);

        // 1. Get Balance
        const { data: userData } = await supabase.from('users').select('balance').eq('id', userId).single();
        if (userData) setBalance(userData.balance);

        // 2. Get Bets
        const { data: betsData } = await supabase
            .from('bets')
            .select(`
                *,
                markets (
                    title,
                    status,
                    total_pool,
                    total_yes_amount,
                    total_no_amount
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (betsData) setBets(betsData);

        // 3. Get Transactions
        const { data: txData } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (txData) setTransactions(txData);

        setLoading(false);
    };

    const calculateCashout = (bet: any) => {
        if (!bet.markets) return 0;
        if (bet.status !== 'ACTIVE') return 0;
        // Cashout only if market is OPEN
        if (bet.markets.status !== 'OPEN') return 0;

        const pool = bet.markets.total_pool || 0;
        const sidePool = bet.side === 'YES' ? bet.markets.total_yes_amount : bet.markets.total_no_amount;

        // Current Probability = Side / Total
        // If side is empty, prob is 0 (should use safe math)
        const prob = pool > 0 ? (sidePool || 0) / pool : 0;

        // Simple Cashout Formula: Potential * Prob * (1 - CashoutFee)
        // Adjust logic to match House Pool if needed
        // Assuming cashout tracks the changing probability

        const cashoutValue = (bet.potential_payout || 0) * prob * 0.80; // 20% Cashout Fee
        return cashoutValue;
    };

    const handleCashout = async (bet: any) => {
        const value = calculateCashout(bet);
        if (value <= 0) return;

        if (!confirm(`Deseja encerrar esta aposta por R$ ${value.toFixed(2)}? Taxa de 20% aplicada.`)) return;

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

    // --- DEPOSIT FLOW ---
    const openDeposit = () => {
        setDepositStep(1);
        setDepositAmount('');
        setIsDepositOpen(true);
    };

    const confirmDepositAmount = () => {
        const val = parseFloat(depositAmount);
        if (!val || val < 1) {
            alert("Valor mínimo de R$ 1,00");
            return;
        }
        setDepositStep(2);
    };

    const finalizeDeposit = async () => {
        if (!user) return;
        setLoading(true);
        const val = parseFloat(depositAmount);

        try {
            // Fee Calculation (0% - Free)
            const fee = 0;
            const netAmount = val;

            // Update Balance (Net)
            const newBalance = balance + netAmount;
            await supabase.from('users').update({ balance: newBalance }).eq('id', user.id);

            // Log Transaction (Deposit)
            await supabase.from('transactions').insert({
                user_id: user.id,
                type: 'DEPOSIT',
                amount: val,
                status: 'COMPLETED',
                description: 'Depósito via PIX'
            });

            // No Fee Log needed if 0, or log 0 if tracking is desired. We skip for now.

            alert(`Depósito de R$ ${val.toFixed(2)} confirmado!\nSaldo Creditado: R$ ${netAmount.toFixed(2)}`);
            setIsDepositOpen(false);
            fetchWalletData();
        } catch (error) {
            console.error(error);
            alert("Erro ao processar depósito.");
        } finally {
            setLoading(false);
        }
    };

    // --- WITHDRAW FLOW ---
    const openWithdraw = () => {
        setWithdrawAmount('');
        setWithdrawPixKey('');
        setIsWithdrawOpen(true);
    };

    const handleWithdraw = async () => {
        if (!user) return;
        const val = parseFloat(withdrawAmount);

        // Min Withdraw Check
        if (!val || val < 10) {
            alert("Valor mínimo de saque: R$ 10,00");
            return;
        }
        // Max Withdraw Check
        if (val > 5000) {
            alert("Limite máximo por operação: R$ 5.000,00");
            return;
        }
        if (!withdrawPixKey) {
            alert("Digite sua chave PIX.");
            return;
        }

        const fee = 2.90; // Fixed Fee
        const totalDeduction = val + fee;

        if (totalDeduction > balance) {
            alert(`Saldo insuficiente.\nPara sacar R$ ${val.toFixed(2)}, você precisa de R$ ${totalDeduction.toFixed(2)} (incl. taxa R$ 2,90).`);
            return;
        }

        if (!confirm(`Confirmar saque?\n\nValor: R$ ${val.toFixed(2)}\nTaxa Fixa: R$ ${fee.toFixed(2)}\nTotal Debitado: R$ ${totalDeduction.toFixed(2)}`)) return;

        setLoading(true);
        try {
            // Update Balance
            const newBalance = balance - totalDeduction;
            await supabase.from('users').update({ balance: newBalance }).eq('id', user.id);

            // Log Withdrawal
            await supabase.from('transactions').insert({
                user_id: user.id,
                type: 'WITHDRAWAL',
                amount: -val,
                status: 'PENDING',
                description: `Saque para ${withdrawPixKey}`
            });

            // Log Fee
            await supabase.from('transactions').insert({
                user_id: user.id,
                type: 'FEE',
                amount: -fee,
                status: 'COMPLETED',
                description: 'Taxa de Saque (Fixa)'
            });

            alert("Solicitação de saque enviada com sucesso! Processamento em até 24h.");
            setIsWithdrawOpen(false);
            fetchWalletData();

        } catch (error: any) {
            alert("Erro no saque: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !user) return <div className="min-h-screen pt-20 flex justify-center text-primary">Carregando carteira...</div>;

    const filteredBets = bets.filter(b => {
        if (tab === 'OPEN') return b.status === 'ACTIVE';
        return b.status !== 'ACTIVE';
    });

    return (
        <div className="max-w-md mx-auto space-y-8 pb-20">
            {/* Balance Card */}
            <div className="bg-surface rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <WalletIcon className="w-24 h-24 text-white" />
                </div>
                <div className="space-y-1 relative z-10">
                    <span className="text-gray-400 text-sm font-medium">Saldo Total</span>
                    <h1 className="text-4xl font-bold text-white tracking-tight">R$ {balance.toFixed(2)}</h1>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 relative z-10">
                    <button
                        onClick={openDeposit}
                        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
                    >
                        <ArrowDownLeft className="w-5 h-5" /> Depositar
                    </button>
                    <button
                        onClick={openWithdraw}
                        className="flex items-center justify-center gap-2 bg-secondary hover:bg-surface border border-white/10 text-white py-3 rounded-xl font-bold transition-all"
                    >
                        <ArrowUpRight className="w-5 h-5" /> Sacar
                    </button>
                </div>
            </div>

            {/* My Predictions */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-400" /> Minhas Apostas
                </h2>

                {/* Tabs */}
                <div className="flex bg-surface rounded-lg p-1 mb-6 border border-white/5">
                    <button
                        onClick={() => setTab('OPEN')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${tab === 'OPEN' ? 'bg-secondary text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Em Aberto
                    </button>
                    <button
                        onClick={() => setTab('CLOSED')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${tab === 'CLOSED' ? 'bg-secondary text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Encerradas
                    </button>
                </div>

                {/* Bets List */}
                <div className="space-y-4">
                    {filteredBets.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-surface/30 rounded-xl border border-white/5 border-dashed">
                            Nenhuma aposta {tab === 'OPEN' ? 'ativa' : 'encerrada'}.
                        </div>
                    ) : (
                        filteredBets.map((bet) => {
                            const cashoutVal = calculateCashout(bet);
                            const isCashable = cashoutVal > 0 && bet.status === 'ACTIVE' && bet.markets.status === 'OPEN';

                            return (
                                <div key={bet.id} className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold text-gray-400 px-2 py-0.5 border border-white/10 rounded uppercase">
                                                {bet.markets.status === 'OPEN' ? 'Ao Vivo' : 'Encerrado'}
                                            </span>
                                            <h3 className="font-bold text-white text-lg leading-tight">{bet.markets.title}</h3>
                                        </div>
                                        <div className={`px-3 py-1 rounded text-xs font-bold ${bet.side === 'YES' ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-500'}`}>
                                            {bet.side === 'YES' ? 'SIM' : 'NÃO'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                        <div>
                                            <span className="text-gray-500 block text-xs">Aportado</span>
                                            <span className="text-white font-mono">R$ {bet.amount.toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs">Retorno Potencial</span>
                                            <span className="text-green-400 font-bold font-mono">R$ {bet.potential_payout.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {isCashable && (
                                        <button
                                            onClick={() => handleCashout(bet)}
                                            disabled={processing === bet.id}
                                            className="w-full py-2 bg-secondary hover:bg-surface border border-white/10 rounded-lg text-sm font-bold text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2"
                                        >
                                            {processing === bet.id ? 'Processando...' : `Encerrar Aposta (Cashout R$ ${cashoutVal.toFixed(2)})`}
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Transaction History */}
            <div className="pt-8 border-t border-white/5">
                <h2 className="text-lg font-bold text-gray-400 mb-4">Últimas Transações</h2>
                <div className="space-y-3">
                    {transactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${tx.type === 'DEPOSIT' || tx.type === 'WIN' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {tx.type === 'DEPOSIT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{tx.description || tx.type}</p>
                                    <p className="text-xs text-gray-500">{format(new Date(tx.created_at), "dd/MM HH:mm", { locale: ptBR })}</p>
                                </div>
                            </div>
                            <span className={`font-mono font-bold ${tx.type === 'DEPOSIT' || tx.type === 'WIN' ? 'text-green-400' : 'text-white'}`}>
                                {tx.type === 'DEPOSIT' || tx.type === 'WIN' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- DEPOSIT BOTTOM SHEET (MODAL) --- */}
            {/* --- DEPOSIT BOTTOM SHEET (MODAL) --- */}
            {isDepositOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsDepositOpen(false)}></div>

                    <div className="relative bg-surface border-t md:border border-white/10 w-full md:max-w-md md:rounded-2xl rounded-t-2xl p-6 space-y-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                        <button onClick={() => setIsDepositOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>

                        {depositStep === 1 ? (
                            // STEP 1: AMOUNT
                            <>
                                <div className="text-center space-y-2">
                                    <div className="w-12 h-12 bg-primary/20 text-primary rounded-full mx-auto flex items-center justify-center mb-4">
                                        <Smartphone className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Quanto quer depositar?</h3>
                                    <p className="text-sm text-gray-400">Depósito instantâneo via PIX</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                        <label className="text-xs text-gray-500 block mb-1">Valor do Depósito</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 font-bold">R$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={depositAmount}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (parseFloat(val) < 0) return; // Prevent negative
                                                    setDepositAmount(val);
                                                }}
                                                className="bg-transparent text-3xl font-bold text-white w-full focus:outline-none placeholder-gray-600"
                                                placeholder="0,00"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Buttons */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {[20, 50, 100, 200].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => setDepositAmount(val.toString())}
                                                className="py-2 bg-secondary hover:bg-white/5 rounded-lg text-sm font-bold text-gray-300 border border-white/5 transition-colors"
                                            >
                                                +{val}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={confirmDepositAmount}
                                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all"
                                >
                                    Gerar PIX
                                </button>
                            </>
                        ) : (
                            // STEP 2: PIX QR CODE
                            <>
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-bold text-white">Pagamento PIX</h3>
                                    <p className="text-sm text-gray-400">Escaneie o QR Code ou copie a chave abaixo</p>
                                </div>

                                <div className="flex justify-center py-4">
                                    <div className="bg-white p-4 rounded-xl">
                                        {/* Mock QR Code */}
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${pixKey}`} alt="PIX QR" className="w-40 h-40" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-center text-sm font-bold text-white">R$ {parseFloat(depositAmount).toFixed(2)}</p>

                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={pixKey}
                                            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 text-xs text-gray-400 truncate focus:outline-none"
                                        />
                                        <button
                                            onClick={() => navigator.clipboard.writeText(pixKey)}
                                            className="p-3 bg-secondary hover:bg-white/10 rounded-lg text-white transition-colors"
                                            title="Copiar"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-xs text-yellow-500 text-center">
                                    Após o pagamento, o saldo será creditado automaticamente.
                                </div>

                                <button
                                    onClick={finalizeDeposit}
                                    className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" /> Já fiz o Pix
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* --- WITHDRAW MODAL --- */}
            {isWithdrawOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsWithdrawOpen(false)}></div>

                    <div className="relative bg-surface border-t md:border border-white/10 w-full md:max-w-md md:rounded-2xl rounded-t-2xl p-6 space-y-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                        <button onClick={() => setIsWithdrawOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold text-white">Solicitar Saque</h3>
                            <p className="text-sm text-gray-400">Taxa fixa de R$ 2,90 por operação</p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                <label className="text-xs text-gray-500 block mb-1">Valor do Saque (mín. R$ 10)</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 font-bold">R$</span>
                                    <input
                                        type="number"
                                        min="10"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className="bg-transparent text-3xl font-bold text-white w-full focus:outline-none placeholder-gray-600"
                                        placeholder="0,00"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                <label className="text-xs text-gray-500 block mb-1">Chave PIX</label>
                                <input
                                    type="text"
                                    value={withdrawPixKey}
                                    onChange={(e) => setWithdrawPixKey(e.target.value)}
                                    className="bg-transparent text-lg text-white w-full focus:outline-none placeholder-gray-600"
                                    placeholder="CPF, Email ou Telefone..."
                                />
                            </div>

                            {parseFloat(withdrawAmount) > 0 && (
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg space-y-1">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Valor Solicitado</span>
                                        <span>R$ {parseFloat(withdrawAmount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-red-400">
                                        <span>Taxa Fixa</span>
                                        <span>+ R$ 2,90</span>
                                    </div>
                                    <div className="border-t border-white/10 my-1"></div>
                                    <div className="flex justify-between text-sm font-bold text-white">
                                        <span>Total Debitado</span>
                                        <span>R$ {(parseFloat(withdrawAmount) + 2.90).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleWithdraw}
                                className="w-full py-4 bg-secondary hover:bg-secondary/90 text-white rounded-xl font-bold text-lg shadow-lg transition-all"
                            >
                                Confirmar Saque
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
