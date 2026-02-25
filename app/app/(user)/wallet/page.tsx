"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ArrowDownLeft, History, Wallet as WalletIcon, X, Copy, CheckCircle, Smartphone, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NotificationModal from '@/components/ui/NotificationModal';

const TRANSLATE_TX_TYPE: Record<string, string> = {
    'DEPOSIT': 'Depósito',
    'WITHDRAWAL': 'Saque',
    'BET_PLACED': 'Previsão Feita',
    'BET_WIN': 'Prêmio', // Fallback just in case old rows still exist
    'WIN': 'Prêmio',
    'WITHDRAW': 'Saque',
    'CASHOUT': 'Cashout',
    'REFUND': 'Reembolso'
};

const TRANSLATE_TX_STATUS: Record<string, { label: string, color: string }> = {
    'PENDING': { label: 'Pendente', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
    'COMPLETED': { label: 'Concluído', color: 'text-primary bg-primary/10 border-primary/20' },
    'FAILED': { label: 'Falhou', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
    'CANCELLED': { label: 'Cancelado', color: 'text-gray-500 bg-gray-500/10 border-gray-500/20' },
    'PROCESSING': { label: 'Processando', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' }
};

export default function WalletPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [bets, setBets] = useState<any[]>([]);
    const [tab, setTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
    const [processing, setProcessing] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('USER');

    // Notification State
    const [notification, setNotification] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'success'
    });

    // Deposit Modal State
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [depositStep, setDepositStep] = useState(1); // 1: Amount, 2: PIX
    const [depositAmount, setDepositAmount] = useState<string>('');
    const [pixKey, setPixKey] = useState(""); // Empty initially, populated by API

    // Withdrawal Modal State
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawPixKey, setWithdrawPixKey] = useState('');
    const [withdrawPixKeyType, setWithdrawPixKeyType] = useState('CPF');

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
        } else {
            setUser(session.user);
            fetchWalletData(session.user.id, true);
        }
    };

    // Auto-polling for balance and tx status
    useEffect(() => {
        if (!user) return;
        const intervalId = setInterval(() => {
            fetchWalletData(user.id, false);
        }, 6000); // Poll every 6 seconds to feel real-time
        return () => clearInterval(intervalId);
    }, [user]);

    const fetchWalletData = async (userId: string = user?.id, showLoading: boolean = true) => {
        if (!userId) return;
        if (showLoading) setLoading(true);

        // 1. Get Balance
        const { data: userData } = await supabase.from('users').select('balance, role').eq('id', userId).single();
        if (userData) {
            setBalance(userData.balance);
            setUserRole(userData.role || 'USER');
        }

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

        if (showLoading) setLoading(false);
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

        if (!confirm(`Deseja encerrar esta previsão por R$ ${value.toFixed(2)}? Taxa de 20% aplicada.`)) return;

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

            setNotification({
                isOpen: true,
                title: 'Cashout Realizado!',
                message: 'Seu lucro foi creditado instantaneamente.',
                type: 'success'
            });
            fetchWalletData();
            window.dispatchEvent(new CustomEvent('force_balance_refresh'));

        } catch (err: any) {
            console.error(err);
            setNotification({
                isOpen: true,
                title: 'Erro no Cashout',
                message: err.message,
                type: 'error'
            });
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

    const confirmDepositAmount = async () => {
        const val = parseFloat(depositAmount);
        if ((!val || val < 10) && userRole !== 'ADMIN') {
            setNotification({
                isOpen: true,
                title: 'Valor Inválido',
                message: 'O depósito mínimo é de R$ 10,00',
                type: 'error'
            });
            return;
        }

        setActionMessage('Gerando código PIX...');
        setLoading(true);
        try {
            const res = await fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: val,
                    userId: user.id
                })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Falha ao gerar PIX");

            if (data.qrCode) {
                setPixKey(data.qrCode);
                setDepositStep(2);
            } else {
                setNotification({
                    isOpen: true,
                    title: 'Erro no PIX',
                    message: 'A API não retornou o código PIX. Tente novamente.',
                    type: 'error'
                });
            }

        } catch (err: any) {
            setNotification({
                isOpen: true,
                title: 'Erro no Depósito',
                message: err.message,
                type: 'error'
            });
        } finally {
            setLoading(false);
            setActionMessage(null);
        }
    };

    const finalizeDeposit = async () => {
        setNotification({
            isOpen: true,
            title: 'Verificando Pagamento',
            message: 'O saldo será atualizado automaticamente assim que o banco confirmar.',
            type: 'info'
        });
        setIsDepositOpen(false);
        fetchWalletData();
    };

    // --- WITHDRAW FLOW ---
    const openWithdraw = () => {
        setWithdrawAmount('');
        setWithdrawPixKey('');
        setWithdrawPixKeyType('CPF');
        setIsWithdrawOpen(true);
    };

    const handleWithdraw = async () => {
        if (!user) return;
        const val = parseFloat(withdrawAmount);

        if ((!val || val < 20) && userRole !== 'ADMIN') {
            setNotification({ isOpen: true, title: 'Valor Mínimo', message: 'Saque mínimo de R$ 20,00', type: 'error' });
            return;
        }
        if (val > 5000 && userRole !== 'ADMIN') {
            setNotification({ isOpen: true, title: 'Limite Excedido', message: 'Máximo de R$ 5.000,00 por vez', type: 'error' });
            return;
        }
        if (!withdrawPixKey && userRole !== 'ADMIN') {
            setNotification({ isOpen: true, title: 'Chave PIX', message: 'Informe a chave PIX de destino.', type: 'error' });
            return;
        }

        const fee = 2.90;
        const totalDeduction = val;
        const netAmount = val - fee;

        if (totalDeduction > balance) {
            setNotification({
                isOpen: true,
                title: 'Saldo Insuficiente',
                message: `Você tem R$ ${balance.toFixed(2)} e está tentando debitar R$ ${totalDeduction.toFixed(2)}`,
                type: 'error'
            });
            return;
        }

        if (netAmount <= 0 && userRole !== 'ADMIN') {
            setNotification({
                isOpen: true,
                title: 'Valor Baixo',
                message: `O valor do saque deve cobrir a taxa de R$ ${fee.toFixed(2)}`,
                type: 'error'
            });
            return;
        }

        if (userRole === 'ADMIN') {
            if (!confirm(`ADMIN TESTE: Confirmar saque via PIX na XGate?\n\nValor Solicitado: R$ ${val.toFixed(2)}\nTaxa Fixa: - R$ ${fee.toFixed(2)}\nValor a Receber: R$ ${netAmount.toFixed(2)}\nChave PIX: ${withdrawPixKey}`)) return;
        } else {
            if (!confirm(`Confirmar saque via PIX?\n\nValor Solicitado: R$ ${val.toFixed(2)}\nTaxa Fixa: - R$ ${fee.toFixed(2)}\nValor a Receber: R$ ${netAmount.toFixed(2)}\nChave PIX: ${withdrawPixKey}`)) return;
        }

        setActionMessage('Processando saque...');
        setLoading(true);
        try {
            const res = await fetch('/api/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: val,
                    userId: user.id,
                    pixKey: withdrawPixKey,
                    pixKeyType: withdrawPixKeyType,
                })
            });
            const data = await res.json();

            setNotification({
                isOpen: true,
                title: 'Saque Solicitado!',
                message: `Você receberá R$ ${netAmount.toFixed(2)} em breve.`,
                type: 'success'
            });
            setIsWithdrawOpen(false);
            fetchWalletData();
            window.dispatchEvent(new CustomEvent('force_balance_refresh'));

        } catch (error: any) {
            setNotification({
                isOpen: true,
                title: 'Erro no Saque',
                message: error.message,
                type: 'error'
            });
        } finally {
            setLoading(false);
            setActionMessage(null);
        }
    };

    if (loading && !user) return <div className="min-h-screen pt-20 flex justify-center text-primary">Carregando carteira...</div>;

    const filteredBets = bets.filter(b => {
        if (tab === 'OPEN') return b.status === 'ACTIVE';
        return b.status !== 'ACTIVE';
    });

    return (
        <div className="max-w-md mx-auto space-y-8 pb-20">
            {/* Fullscreen Loading Overlay */}
            {actionMessage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface/90 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-white font-bold text-lg">{actionMessage}</p>
                        <p className="text-gray-500 text-xs">Aguarde...</p>
                    </div>
                </div>
            )}
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
                    <History className="w-5 h-5 text-gray-400" /> Minhas Previsões
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
                            Nenhuma previsão {tab === 'OPEN' ? 'ativa' : 'encerrada'}.
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
                                            <span className="text-primary font-bold font-mono">R$ {bet.potential_payout.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {isCashable && (
                                        <button
                                            onClick={() => handleCashout(bet)}
                                            disabled={processing === bet.id}
                                            className="w-full py-2 bg-secondary hover:bg-surface border border-white/10 rounded-lg text-sm font-bold text-gray-300 hover:text-white transition-colors flex items-center justify-center gap-2"
                                        >
                                            {processing === bet.id ? 'Processando...' : `Encerrar Previsão (Cashout R$ ${cashoutVal.toFixed(2)})`}
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
                                <div className={`p-2 rounded-full ${(tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'BET_WIN' || tx.type === 'REFUND') ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                                    {(tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'BET_WIN' || tx.type === 'REFUND') ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-white">{TRANSLATE_TX_TYPE[tx.type] || tx.type}</p>
                                        {tx.status && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${TRANSLATE_TX_STATUS[tx.status]?.color || 'text-gray-400 border-gray-600 bg-black'}`}>
                                                {TRANSLATE_TX_STATUS[tx.status]?.label || tx.status}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">{tx.description}</p>
                                    <p className="text-xs text-gray-500">{format(new Date(tx.created_at), "dd/MM HH:mm", { locale: ptBR })}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`font-mono font-bold block ${(tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'BET_WIN' || tx.type === 'REFUND') ? 'text-primary' : 'text-white'}`}>
                                    {(tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'BET_WIN' || tx.type === 'REFUND') ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                                </span>
                                {tx.status === 'PENDING' && tx.type === 'DEPOSIT' && (
                                    <span className="text-[10px] text-yellow-500">Aguardando Pagamento</span>
                                )}
                            </div>
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
                                        <label className="text-xs text-gray-500 block mb-1">Valor do Depósito (mín. R$ 10)</label>
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
                                    className="w-full py-4 bg-primary hover:bg-primary/85 text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2"
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
                            <p className="text-sm text-gray-400">
                                {userRole === 'ADMIN' ? 'Modo Admin: Sem limite mínimo, mas com taxa' : 'Taxa fixa de R$ 2,90 por operação'}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                <label className="text-xs text-gray-500 block mb-1">Valor do Saque (mín. R$ 20)</label>
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
                                <label className="text-xs text-gray-500 block mb-1">Tipo de Chave</label>
                                <select
                                    value={withdrawPixKeyType}
                                    onChange={(e) => setWithdrawPixKeyType(e.target.value)}
                                    className="bg-transparent text-lg text-white w-full focus:outline-none placeholder-gray-600 appearance-none"
                                >
                                    <option value="CPF" className="bg-surface">CPF</option>
                                    <option value="EMAIL" className="bg-surface">E-mail</option>
                                    <option value="PHONE" className="bg-surface">Telefone</option>
                                    <option value="RANDOM" className="bg-surface">Chave Aleatória</option>
                                </select>
                            </div>

                            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                                <label className="text-xs text-gray-500 block mb-1">Chave PIX</label>
                                <input
                                    type="text"
                                    value={withdrawPixKey}
                                    onChange={(e) => setWithdrawPixKey(e.target.value)}
                                    className="bg-transparent text-lg text-white w-full focus:outline-none placeholder-gray-600"
                                    placeholder={withdrawPixKeyType === 'CPF' ? "000.000.000-00" : withdrawPixKeyType === 'EMAIL' ? "seu@email.com" : "Sua chave..."}
                                />
                            </div>

                            {parseFloat(withdrawAmount) > 0 && (
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg space-y-1">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Valor Solicitado (Debitado)</span>
                                        <span>R$ {parseFloat(withdrawAmount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-red-400">
                                        <span>Taxa Fixa da Operação</span>
                                        <span>- R$ 2,90</span>
                                    </div>
                                    <div className="border-t border-white/10 my-1"></div>
                                    <div className="flex justify-between text-sm font-bold text-white">
                                        <span>Você Recebe na Conta</span>
                                        <span>R$ {Math.max(0, parseFloat(withdrawAmount) - 2.90).toFixed(2)}</span>
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
