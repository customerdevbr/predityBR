"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Share2, Check, CheckCircle, AlertCircle, X, Users, TrendingUp, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { format, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import confetti from 'canvas-confetti';

interface MarketDetailClientProps {
    initialMarket: any;
    currentUser: any;
}

const COLORS = ['#EF4444', '#14B8A6', '#EC4899', '#6366F1', '#F59E0B', '#8B5CF6'];

// ── Custom Toast ──────────────────────────────────────────────────────────────
type Toast = { id: number; type: 'success' | 'error' | 'info'; title: string; message?: string };

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
    return (
        <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-300 ${t.type === 'success' ? 'bg-[#0d1a0d]/95 border-primary/30' :
                        t.type === 'error' ? 'bg-[#1a0d0d]/95 border-red-500/30' :
                            'bg-surface/95 border-white/10'
                        }`}
                >
                    {t.type === 'success' && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />}
                    {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                    {t.type === 'info' && <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm">{t.title}</p>
                        {t.message && <p className="text-xs text-gray-400 mt-0.5">{t.message}</p>}
                    </div>
                    <button onClick={() => onRemove(t.id)} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ── Participant avatars row ────────────────────────────────────────────────────
function ParticipantRow({ marketId, totalPool }: { marketId: string; totalPool: number }) {
    const [avatars, setAvatars] = useState<string[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const load = async () => {
            // Get latest bettor user_ids (up to 30 for dedup)
            const { data } = await supabase
                .from('bets')
                .select('user_id, users(avatar_url)')
                .eq('market_id', marketId)
                .order('created_at', { ascending: false })
                .limit(30);

            if (!data) return;

            const seen = new Set<string>();
            const imgs: string[] = [];
            for (const row of data) {
                if (!seen.has(row.user_id)) {
                    seen.add(row.user_id);
                    const url = (row as any).users?.avatar_url;
                    if (url) imgs.push(url);
                }
            }
            setAvatars(imgs.slice(0, 6));
            setTotal(seen.size);
        };
        load();
    }, [marketId, totalPool]); // re-run when pool changes (new bet placed)

    if (total === 0) return null;

    return (
        <div className="flex items-center gap-3 py-2">
            {/* Stacked avatars */}
            <div className="flex">
                {avatars.map((url, i) => (
                    <div
                        key={i}
                        className="w-7 h-7 rounded-full border-2 border-[#0f1115] overflow-hidden flex-shrink-0 bg-surface"
                        style={{ marginLeft: i === 0 ? 0 : -10, zIndex: avatars.length - i }}
                    >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                ))}
                {/* Placeholder circles when no avatar */}
                {Array.from({ length: Math.min(6 - avatars.length, Math.max(0, total - avatars.length)) }).map((_, i) => (
                    <div
                        key={`ph-${i}`}
                        className="w-7 h-7 rounded-full border-2 border-[#0f1115] bg-surface flex items-center justify-center flex-shrink-0"
                        style={{ marginLeft: (avatars.length === 0 && i === 0) ? 0 : -10, zIndex: 10 - i }}
                    >
                        <Users className="w-3 h-3 text-gray-500" />
                    </div>
                ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
                <span><strong className="text-white">{total}</strong> participantes</span>
                <span className="text-white/10">·</span>
                <span>Pool: <strong className="text-primary">R$ {(totalPool || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MarketDetailClient({ initialMarket, currentUser }: MarketDetailClientProps) {
    const router = useRouter();

    const [market, setMarket] = useState<any>(initialMarket);
    const [user, setUser] = useState<any>(currentUser);

    const [selectedOutcome, setSelectedOutcome] = useState<string>('');
    const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);
    const [amount, setAmount] = useState<string>('');
    const [placingBet, setPlacingBet] = useState(false);
    const [timeFilter, setTimeFilter] = useState('Tudo');

    // ── Toast state ──
    const [toasts, setToasts] = useState<Toast[]>([]);
    let toastId = 0;

    const showToast = useCallback((type: Toast['type'], title: string, message?: string, ms = 4000) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ms);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ── Init selected outcome ──
    useEffect(() => {
        if (market?.outcomes?.length > 0 && !selectedOutcome) {
            setSelectedOutcome(market.outcomes[0]);
        }
    }, [market, selectedOutcome]);

    // ── Festive Animation on Load ──
    useEffect(() => {
        if (!market || !market.category) return;

        const categoryEmojiMap: Record<string, string> = {
            'Futebol': '⚽',
            'eSports': '🎮',
            'Política': '⚖️',
            'Cripto': '₿',
            'Entretenimento': '🍿',
            'Esportes': '🏆'
        };

        const emoji = categoryEmojiMap[market.category] || '🎯';
        const moneyEmoji = '💵';

        const duration = 2000;
        const end = Date.now() + duration;

        (function frame() {
            // Launch from bottom left
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 1 },
                colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'],
                shapes: ['circle', 'square'],
                scalar: 1.2
            });
            // Launch from bottom right
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 1 },
                colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'],
                shapes: ['circle', 'square'],
                scalar: 1.2
            });

            // Occasional emoji confetti
            if (Math.random() > 0.6) {
                confetti({
                    particleCount: 1,
                    angle: 90,
                    spread: 80,
                    origin: { x: Math.random(), y: 1 },
                    shapes: [confetti.shapeFromText({ text: Math.random() > 0.5 ? emoji : moneyEmoji, scalar: 3 })],
                    scalar: 2
                });
            }

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }, [market?.category]);

    // ── Realtime market updates ──
    useEffect(() => {
        const channel = supabase
            .channel(`market_${market.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${market.id}` },
                (payload) => { setMarket(payload.new); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [market.id]);

    // ── Auth ──
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) setUser(session.user);
        };
        checkSession();
    }, []);

    // ── Odds formula: commission on profit only ──
    // finalOdds = 1 + (rawOdds - 1) * 0.65  → always ≥ 1.0x
    const outcomeStats = useMemo(() => {
        if (!market || !market.outcomes) return [];
        const totalPool = market.total_pool || 0;
        return market.outcomes.map((outcome: string, index: number) => {
            const outcomePool = market.outcome_pools?.[outcome] || 0;
            const prob = totalPool === 0 ? (100 / market.outcomes.length) : ((outcomePool / totalPool) * 100);
            const rawOdds = (totalPool === 0 || outcomePool === 0)
                ? market.outcomes.length   // equal split when no bets yet
                : (totalPool / outcomePool);
            // 35% commission on profit only — never below 1x
            const finalOdds = Math.max(1.0, 1 + (rawOdds - 1) * 0.65);
            return {
                name: outcome,
                prob: prob.toFixed(1),
                odds: finalOdds.toFixed(2),
                color: COLORS[index % COLORS.length]
            };
        }).sort((a: any, b: any) => parseFloat(b.prob) - parseFloat(a.prob));
    }, [market]);

    const chartData = useMemo(() => {
        if (outcomeStats.length === 0) return [];
        const data = [];
        const now = new Date();
        const dataPoints = 20;
        const walks: Record<string, number[]> = {};
        outcomeStats.forEach((stat: any) => {
            const targetProb = parseFloat(stat.prob);
            walks[stat.name] = Array(dataPoints).fill(targetProb);
        });

        for (let i = 0; i < dataPoints; i++) {
            const pointTime = subHours(now, dataPoints - i);
            const dataPoint: any = {
                timeLabel: format(pointTime, i === 0 || i === Math.floor(dataPoints / 2) ? 'dd MMM.' : 'HH:mm', { locale: ptBR }),
            };
            outcomeStats.forEach((stat: any) => {
                dataPoint[stat.name] = walks[stat.name][i];
            });
            data.push(dataPoint);
        }
        return data;
    }, [outcomeStats]);

    const selectedStat = outcomeStats.find((s: any) => s.name === selectedOutcome);
    const parsedAmount = parseFloat(amount) || 0;
    const currentOddsOption = parseFloat(selectedStat?.odds || "0");
    const estimatedReturn = selectedStat ? parsedAmount * currentOddsOption : 0;

    // Calcula a participação proporcional estimada
    const optionPool = market?.outcome_pools?.[selectedOutcome] || 0;
    const denominator = Math.max(optionPool, 1);
    const shareEstimate = parsedAmount / denominator;

    // ── Bet handler — optimistic update ──
    const handleBet = async () => {
        if (!user) { router.push('/login'); return; }
        if (!selectedOutcome) { showToast('error', 'Selecione uma opção para prever.'); return; }
        const val = parseFloat(amount);
        if (isNaN(val) || val < 2) {
            showToast('error', 'Previsão mínima de R$ 2,00');
            return;
        }

        setPlacingBet(true);
        try {
            const { data: userData, error: userError } = await supabase
                .from('users').select('balance').eq('id', user.id).single();
            if (userError || !userData) throw userError || new Error('User data not found');

            if ((userData.balance || 0) < val) {
                showToast('error', 'Saldo insuficiente', 'Faça um depósito na sua carteira.');
                setPlacingBet(false);
                return;
            }

            const currentOdds = parseFloat(selectedStat!.odds);

            const { error: betError } = await supabase.from('bets').insert({
                user_id: user.id,
                market_id: market.id,
                side: selectedOutcome,
                amount: val,
                odds_at_entry: currentOdds,
                potential_payout: val * currentOdds,
                status: 'ACTIVE'
            });
            if (betError) throw betError;

            // Deduct balance
            const { error: balanceError } = await supabase.rpc('decrement_balance', { userid: user.id, amount: val });
            if (balanceError) {
                await supabase.from('users').update({ balance: userData.balance - val }).eq('id', user.id);
            }

            // Dispatch instant global UI update for Header
            window.dispatchEvent(new CustomEvent('optimistic_balance_update', {
                detail: { newBalance: userData.balance - val }
            }));

            // Update pool — also triggers realtime subscription to update UI instantly
            const newTotalPool = (market.total_pool || 0) + val;
            const newOutcomePool = (market.outcome_pools?.[selectedOutcome] || 0) + val;
            const newPools = { ...market.outcome_pools, [selectedOutcome]: newOutcomePool };

            await supabase.from('markets').update({
                total_pool: newTotalPool,
                outcome_pools: newPools
            }).eq('id', market.id);

            // Optimistic local update (realtime subscription will also fire)
            setMarket((prev: any) => ({
                ...prev,
                total_pool: newTotalPool,
                outcome_pools: newPools
            }));

            showToast('success', '🎯 Previsão confirmada!',
                `R$ ${val.toFixed(2)} em "${selectedOutcome}"`);
            setAmount('');
            setIsMobileSlipOpen(false); // Close mobile sheet on success
        } catch (err: any) {
            console.error(err);
            showToast('error', 'Erro ao processar previsão', err.message);
        } finally {
            setPlacingBet(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try { await navigator.share({ title: market.title, text: `Faça sua previsão: ${market.title}`, url }); }
            catch (err) { console.log('Erro ao compartilhar:', err); }
        } else {
            navigator.clipboard.writeText(url);
            showToast('info', 'Link copiado!');
        }
    };

    if (!market) return <div className="min-h-screen pt-20 text-center text-gray-400">Mercado não encontrado.</div>;

    return (
        <>
            {/* Toast Layer */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Fullscreen Loading Overlay */}
            {placingBet && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface/90 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-white font-bold text-lg">Processando previsão...</p>
                        <p className="text-gray-500 text-xs">Aguarde...</p>
                    </div>
                </div>
            )}
            <div className="max-w-[1200px] mx-auto p-4 lg:p-8 pb-40 lg:pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

                    {/* LEFT COLUMN */}
                    <div className="space-y-6">

                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Link href="/app/markets" className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                </Link>
                                <img src={market.image_url || "https://placehold.co/100"} alt={market.title} className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0" />
                                <h1 className="text-xl font-bold leading-tight line-clamp-2 pr-4">{market.title}</h1>
                            </div>
                            <button onClick={handleShare} className="p-2 bg-surface border border-white/5 rounded-lg text-primary hover:bg-white/5 transition-colors flex-shrink-0">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* CHART SECTION */}
                        <div className="bg-surface rounded-xl border border-white/5 p-4 md:p-6 space-y-6 shadow-lg shadow-black/50">

                            {/* Chart Legend */}
                            <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-300">
                                {outcomeStats.map((stat: any) => (
                                    <div key={stat.name} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                                        <span>{stat.name}: {stat.prob}%</span>
                                    </div>
                                ))}
                            </div>

                            {/* Line Chart */}
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -30 }}>
                                    <XAxis dataKey="timeLabel" tick={{ fill: '#4B5563', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#4B5563', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                        labelStyle={{ color: '#9CA3AF' }}
                                        formatter={(value: any, name: any) => [`${parseFloat(value).toFixed(1)}%`, name]}
                                    />
                                    {outcomeStats.map((stat: any) => (
                                        <Line key={stat.name} type="monotone" dataKey={stat.name} stroke={stat.color} strokeWidth={2} dot={false} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>

                            {/* Time Filter */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {['Ao Vivo', '1H', '6H', '1D', '1S', '1M', 'Tudo'].map(tf => (
                                    <button key={tf} onClick={() => setTimeFilter(tf)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${timeFilter === tf ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Market Info */}
                        {market.description && (
                            <div className="bg-surface/50 border border-white/5 rounded-xl p-4 text-sm text-gray-400 leading-relaxed">
                                {market.description}
                            </div>
                        )}

                        {/* Proof of Result (visible when market is resolved and proof exists) */}
                        {market.status === 'RESOLVED' && market.metadata?.resolution_proof && (
                            (() => {
                                const proof = market.metadata.resolution_proof;
                                const hasProof = proof.text || proof.link || proof.image;
                                if (!hasProof) return null;
                                return (
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                                            <CheckCircle className="w-4 h-4" />
                                            Prova do Resultado
                                        </div>
                                        {proof.text && (
                                            <p className="text-sm text-gray-300 leading-relaxed">{proof.text}</p>
                                        )}
                                        {proof.link && (
                                            <a href={proof.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                                🔗 Ver fonte oficial
                                            </a>
                                        )}
                                        {proof.image && (
                                            <img src={proof.image} alt="Prova do resultado" className="rounded-lg border border-white/10 max-w-full" />
                                        )}
                                    </div>
                                );
                            })()
                        )}
                    </div>

                    {/* RIGHT COLUMN: Bet Slip Container */}
                    <div className="w-full lg:w-auto">

                        {/* Mobile Overlay */}
                        {isMobileSlipOpen && (
                            <div
                                className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                                onClick={() => setIsMobileSlipOpen(false)}
                            />
                        )}

                        {/* The Bet Slip Panel */}
                        <div className={`
                            fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out transform rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] bg-surface
                            ${isMobileSlipOpen ? 'translate-y-0' : 'translate-y-full'}
                            lg:static lg:translate-y-0 lg:z-auto lg:rounded-xl lg:border lg:border-white/5 lg:shadow-2xl lg:block
                        `}>
                            {/* Mobile Drag Handle & Close */}
                            <div className="lg:hidden flex justify-center items-center p-3 relative bg-[#12141a] rounded-t-3xl border-b border-white/5">
                                <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
                                <button
                                    onClick={() => setIsMobileSlipOpen(false)}
                                    className="absolute right-4 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Scrollable interior for mobile, sticky wrapper for desktop */}
                            <div className="p-4 md:p-5 space-y-4 max-h-[85vh] overflow-y-auto lg:max-h-[calc(100vh-6rem)] lg:sticky lg:top-24 scrollbar-hide">

                                {/* Participant row — above outcome options */}
                                <ParticipantRow marketId={market.id} totalPool={market.total_pool || 0} />

                                {market.status === 'RESOLVED' ? (
                                    <div className="bg-black/20 border border-white/5 rounded-xl p-6 text-center space-y-3 mt-4">
                                        <div className="w-12 h-12 bg-white/5 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                                            <Lock className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-white font-bold text-lg">Mercado Encerrado</h3>
                                        <p className="text-sm text-gray-500 leading-relaxed">Este mercado já foi finalizado e os pagamentos foram distribuídos. Nenhuma nova previsão pode ser feita.</p>
                                        {market.resolution_result && (
                                            <div className="mt-4 inline-flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg font-bold text-sm w-full">
                                                <CheckCircle className="w-4 h-4" /> Resultado Final: {market.resolution_result}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {/* OUTCOME SELECTOR */}
                                        <div className="space-y-2">
                                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Sua previsão</div>
                                            <div className={`grid gap-2 ${outcomeStats.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                {outcomeStats.map((stat: any) => {
                                                    const isSelected = selectedOutcome === stat.name;
                                                    return (
                                                        <button
                                                            key={stat.name}
                                                            onClick={() => setSelectedOutcome(stat.name)}
                                                            className={`relative p-3 rounded-xl border transition-all text-left overflow-hidden ${isSelected ? 'bg-white/5 border-primary/60 ring-1 ring-primary/40' : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'}`}
                                                        >
                                                            {/* Progress bg */}
                                                            <div className="absolute left-0 top-0 bottom-0 opacity-20 transition-all" style={{ width: `${stat.prob}%`, backgroundColor: stat.color }} />
                                                            <div className="relative flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                                                    <span className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>{stat.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                                    <span className={`text-sm font-black ${isSelected ? 'text-primary' : 'text-gray-400'}`}>{stat.odds}x</span>
                                                                    <span className="text-[10px] text-gray-500">{stat.prob}%</span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="border-t border-white/5" />

                                        {/* AMOUNT INPUT */}
                                        <div className="space-y-3">
                                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Quantia</div>
                                            <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-2 gap-2">
                                                <button onClick={() => setAmount(Math.max(0, (parseFloat(amount) || 0) - 10).toString())}
                                                    className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg font-bold">
                                                    -
                                                </button>
                                                <div className="flex-1 flex items-center justify-center gap-1">
                                                    <span className="text-xl font-bold text-white">R$</span>
                                                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                                                        className="w-20 bg-transparent text-2xl font-bold text-white focus:outline-none text-center p-0"
                                                        placeholder="0" />
                                                </div>
                                                <button onClick={() => setAmount(((parseFloat(amount) || 0) + 10).toString())}
                                                    className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg font-bold">
                                                    +
                                                </button>
                                            </div>

                                            <div className="flex gap-2">
                                                {[10, 20, 50, 100].map(val => (
                                                    <button key={val} onClick={() => setAmount(val.toString())}
                                                        className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs font-bold text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                                                        +R$ {val}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* REWARD PREVIEW (Dynamic Checkoout Info) */}
                                        <div className="space-y-1.5 pt-3 border-t border-white/5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400">Odd Estimada Atual</span>
                                                <span className="font-bold text-gray-200">{currentOddsOption.toFixed(2)}x</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400">Participação Estimada</span>
                                                <span className="font-bold text-gray-200">{shareEstimate > 0 ? (shareEstimate * 100).toFixed(1) + '%' : '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm mt-1">
                                                <span className="text-gray-300 font-bold">Retorno Estimado</span>
                                                <span className="font-black text-primary text-base">
                                                    R$ {estimatedReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-gray-500 leading-tight bg-white/5 p-2 rounded-lg text-center mt-2">
                                            Odds dinâmicas estimadas. O pagamento final pode variar conforme novas previsões entram até o fechamento do mercado.
                                        </div>

                                        {/* BET BUTTON */}
                                        <button
                                            onClick={handleBet}
                                            disabled={placingBet || !amount || parseFloat(amount) <= 0 || !selectedOutcome}
                                            className="w-full py-3.5 rounded-xl font-bold text-base text-white bg-primary hover:bg-primary/85 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(4,179,5,0.3)]"
                                        >
                                            {placingBet ? 'Processando...' : 'Fazer Previsão'}
                                        </button>
                                    </>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Trigger Button */}
            <div className="fixed bottom-[60px] inset-x-0 z-30 p-4 bg-[#0f1115]/95 backdrop-blur-md border-t border-white/10 lg:hidden pb-safe">
                <button
                    onClick={() => setIsMobileSlipOpen(true)}
                    className="w-full py-3.5 flex items-center justify-center gap-2 rounded-xl font-bold text-base text-white bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(4,179,5,0.3)] transition-all active:scale-[0.98]"
                >
                    Fazer Previsão
                </button>
            </div>
        </>
    );
}
