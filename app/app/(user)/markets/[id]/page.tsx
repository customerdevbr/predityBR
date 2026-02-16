"use client";

import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Users, DollarSign, TrendingUp, AlertCircle, Share2, Info } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MarketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [market, setMarket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES');
    const [amount, setAmount] = useState<string>('');
    const [placingBet, setPlacingBet] = useState(false);
    const [user, setUser] = useState<any>(null);
    // Removed unused balance state to fix lint if needed, or keeping for potential UI use

    useEffect(() => {
        fetchMarket();
        checkUser();
    }, [id]);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUser(session.user);
        }
    }

    const fetchMarket = async () => {
        const { data, error } = await supabase
            .from('markets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Error fetching market", error);
        } else {
            setMarket(data);
        }
        setLoading(false);
    };

    const calculateOdds = () => {
        if (!market) return { yes: 1.0, no: 1.0, probYes: 50, probNo: 50 };

        const pool = market.total_pool > 0 ? market.total_pool : 0;
        const yes = market.total_yes_amount > 0 ? market.total_yes_amount : 0;
        const no = market.total_no_amount > 0 ? market.total_no_amount : 0;

        // Probabilities for display (Proportional)
        // If 0 bets, 50/50
        let probYes = (pool > 0) ? (yes / pool) : 0.5;
        let probNo = (pool > 0) ? (no / pool) : 0.5;

        // House Edge 18% -> Payout Ratio 0.82
        const houseEdgeInv = 0.82;

        // Odds Formula: (TotalPool * 0.82) / SideAmount
        // Verification: If I bet 10 on YES. Total Pool becomes X.
        // My Payout Share = (10 / TotalYes) * (TotalPool * 0.82)
        // Implied Odd = Payout / Bet = (TotalPool * 0.82) / TotalYes.

        // Handle empty sides to avoid division by zero or infinite odds
        // If side is empty, we can show a default header odd (e.g. 2.0 or 1.0)
        // or calculate based on the first unit bet? 
        // For display, let's use the current ratio. 
        const oddsYes = yes > 0 ? (pool * houseEdgeInv) / yes : 1.64; // Fallback or 2.0 * 0.82
        const oddsNo = no > 0 ? (pool * houseEdgeInv) / no : 1.64;

        return {
            yes: oddsYes,
            no: oddsNo,
            probYes: Math.round(probYes * 100),
            probNo: Math.round(probNo * 100)
        };
    }

    const handleBet = async () => {
        if (!user) {
            router.push('/login');
            return;
        }

        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) return;

        setPlacingBet(true);

        try {
            // 1. Check Balance again
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('balance')
                .eq('id', user.id)
                .single();
            if (userError || !userData) throw userError || new Error("User data not found");

            if ((userData.balance || 0) < val) {
                alert("Saldo insuficiente! Faça um depósito na carteira.");
                setPlacingBet(false);
                return;
            }

            // 2. Insert Bet
            const currentOdds = selectedSide === 'YES' ? odds.yes : odds.no;
            const potentialReturn = val * currentOdds;

            const { error: betError } = await supabase.from('bets').insert({
                user_id: user.id,
                market_id: market.id,
                side: selectedSide,
                amount: val,
                odds_at_entry: currentOdds,
                potential_payout: potentialReturn,
                status: 'ACTIVE'
            });

            if (betError) throw betError;

            // 3. Update User Balance (Debit)
            const { error: balanceError } = await supabase.rpc('decrement_balance', {
                userid: user.id,
                amount: val
            });

            if (balanceError) {
                console.warn("RPC failed, trying manual update", balanceError);
                await supabase.from('users').update({ balance: userData.balance - val }).eq('id', user.id);
            }

            alert(`Aposta confirmada! Potencial de R$ ${potentialReturn.toFixed(2)}`);
            setAmount('');
            fetchMarket();

        } catch (err: any) {
            console.error(err);
            alert("Erro ao realizar aposta: " + err.message);
        } finally {
            setPlacingBet(false);
        }
    }

    if (loading) return <div className="min-h-screen pt-20 flex justify-center text-primary">Carregando...</div>;
    if (!market) return <div className="min-h-screen pt-20 text-center text-gray-400">Mercado não encontrado.</div>;

    const odds = calculateOdds();
    const currentOdds = selectedSide === 'YES' ? odds.yes : odds.no;
    const parsedAmount = parseFloat(amount) || 0;
    const potentialReturn = parsedAmount * currentOdds;

    return (
        <div className="max-w-md mx-auto pb-40">
            {/* Navbar / Header */}
            <div className="flex items-center justify-between py-4 mb-4">
                <Link href="/app/markets" className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex gap-4">
                    <button className="text-gray-400 hover:text-white">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Market Title & Icon */}
            <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                    <img src={market.image_url || "https://placehold.co/100x100?text=BTC"} alt={market.title} className="w-16 h-16 rounded-lg object-cover bg-surface" />
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold leading-tight text-white">{market.title}</h1>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>Fecha {formatDistanceToNow(new Date(market.end_date), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Probability Bars */}
            <div className="bg-surface rounded-xl p-6 border border-white/5 space-y-6 mb-8">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Probabilidade do Mercado</h2>

                <div className="space-y-4">
                    {/* YES */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-3">
                                {market.metadata?.yes_image ? (
                                    <img src={market.metadata.yes_image} alt="Sim" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-[10px] text-gray-500">IMG</div>
                                )}
                                <span className="font-bold text-primary text-lg">SIM</span>
                            </div>
                            <span className="font-mono text-2xl text-white">{odds.probYes}%</span>
                        </div>
                        <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${odds.probYes}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>R$ {market.total_yes_amount?.toLocaleString() || '0'} apostados</span>
                            <span className="text-green-400 font-bold">{odds.yes.toFixed(2)}x Multiplicador</span>
                        </div>
                    </div>

                    {/* NO */}
                    <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-3">
                                {market.metadata?.no_image ? (
                                    <img src={market.metadata.no_image} alt="Não" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-[10px] text-gray-500">IMG</div>
                                )}
                                <span className="font-bold text-red-500 text-lg">NÃO</span>
                            </div>
                            <span className="font-mono text-2xl text-white">{odds.probNo}%</span>
                        </div>
                        <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${odds.probNo}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>R$ {market.total_no_amount?.toLocaleString() || '0'} apostados</span>
                            <span className="text-red-400 font-bold">{odds.no.toFixed(2)}x Multiplicador</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Betting Interface */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0f1115] border-t border-white/10 p-4 pb-24 md:pb-4 z-40">
                <div className="max-w-md mx-auto space-y-4">
                    {/* Outcome Selector */}
                    <div className="flex bg-surface rounded-lg p-1 border border-white/5">
                        <button
                            onClick={() => setSelectedSide('YES')}
                            className={`flex-1 py-3 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${selectedSide === 'YES' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Apostar SIM <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded ml-1">{odds.yes.toFixed(2)}x</span>
                        </button>
                        <button
                            onClick={() => setSelectedSide('NO')}
                            className={`flex-1 py-3 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${selectedSide === 'NO' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Apostar NÃO <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded ml-1">{odds.no.toFixed(2)}x</span>
                        </button>
                    </div>

                    {/* Input, Chips & Info */}
                    <div className="space-y-3">
                        {/* Quick Chips */}
                        <div className="flex gap-2 justify-between">
                            {[10, 20, 50, 100].map(val => (
                                <button
                                    key={val}
                                    onClick={() => setAmount(val.toString())}
                                    className="flex-1 py-1.5 bg-surface border border-white/10 rounded-md text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    R$ {val}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <div className="relative flex-1 flex items-center">
                                <button
                                    onClick={() => setAmount(Math.max(0, (parseFloat(amount) || 0) - 10).toString())}
                                    className="w-10 h-full absolute left-0 bg-surface border border-white/10 rounded-l-lg text-gray-400 hover:text-white flex items-center justify-center z-10"
                                >
                                    -
                                </button>

                                <span className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-400 font-bold z-10">R$</span>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-surface border border-white/10 rounded-lg pl-16 pr-12 py-3 font-bold text-white focus:outline-none focus:border-white/30 text-center"
                                    placeholder="0"
                                />

                                <button
                                    onClick={() => setAmount(((parseFloat(amount) || 0) + 10).toString())}
                                    className="w-10 h-full absolute right-0 bg-surface border border-white/10 rounded-r-lg text-gray-400 hover:text-white flex items-center justify-center z-10"
                                >
                                    +
                                </button>
                            </div>
                            <div className="flex flex-col justify-center min-w-[90px] text-right">
                                <span className="text-[10px] text-gray-400 uppercase">Retorno</span>
                                <span className="text-sm font-bold text-green-400">R$ {potentialReturn.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleBet}
                        disabled={placingBet || !amount}
                        className={`w-full py-3.5 rounded-lg font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${selectedSide === 'YES' ? 'bg-primary hover:bg-primary/90' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        {placingBet ? 'Processando...' : `Confirmar Aposta ${selectedSide === 'YES' ? 'SIM' : 'NÃO'}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
