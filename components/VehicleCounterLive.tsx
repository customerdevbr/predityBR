"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Zap, Car, Clock, AlertTriangle, TrendingUp, TrendingDown, Users } from 'lucide-react';

interface VehicleCounterLiveProps {
    market: any;
    currentUser: any;
    onBetPlaced?: () => void;
    serverNow?: number;  // Date.now() medido no servidor (SSR) — evita drift de relógio do cliente
}

const STREAM_URL = 'https://34.104.32.249.nip.io/SP055-KM110A/stream.m3u8';

function HistoryDots({ markets }: { markets: Array<{ id: string; resolution_result?: string }> }) {
    if (!markets.length) return null;
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {markets.map(m => {
                const isMore = m.resolution_result === 'MAIS';
                return (
                    <span
                        key={m.id}
                        title={isMore ? 'MAIS' : 'MENOS'}
                        className={`w-3 h-3 rounded-full border ${isMore ? 'bg-green-500 border-green-400' : 'bg-red-500 border-red-400'}`}
                    />
                );
            })}
        </div>
    );
}

function LiveBetsFeed({ marketId, greenOutcome, labels, max = 6 }: {
    marketId: string;
    greenOutcome: string;
    labels: Record<string, string>;
    max?: number;
}) {
    const [bets, setBets] = useState<Array<{ id: string; outcome: string; amount: number }>>([]);

    useEffect(() => {
        supabase.from('bets').select('id, outcome, amount, created_at')
            .eq('market_id', marketId).order('created_at', { ascending: false }).limit(max)
            .then(({ data }) => { if (data) setBets(data.reverse()); });

        const ch = supabase.channel(`bets-feed-${marketId}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'bets',
                filter: `market_id=eq.${marketId}`,
            }, (payload) => {
                const b = payload.new as any;
                setBets(prev => [...prev.slice(-(max - 1)), { id: b.id, outcome: b.outcome, amount: b.amount }]);
            })
            .subscribe();

        return () => { supabase.removeChannel(ch); };
    }, [marketId, max]);

    if (!bets.length) return <p className="text-xs text-gray-600 italic">Nenhum palpite ainda nesta rodada.</p>;

    return (
        <div className="space-y-1.5">
            {bets.map(b => (
                <div key={b.id} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-1.5">
                    <span className={`font-bold ${b.outcome === greenOutcome ? 'text-green-400' : 'text-red-400'}`}>
                        {labels[b.outcome] ?? b.outcome}
                    </span>
                    <span className="text-gray-400">{formatCurrency(b.amount)}</span>
                </div>
            ))}
        </div>
    );
}

export default function VehicleCounterLive({ market, currentUser, onBetPlaced, serverNow }: VehicleCounterLiveProps) {
    const [round, setRound] = useState<any>(null);
    const [prevRound, setPrevRound] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [historyMarkets, setHistoryMarkets] = useState<any[]>([]);
    const [betSide, setBetSide] = useState<'MAIS' | 'MENOS' | null>(null);
    const [betAmount, setBetAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [userBet, setUserBet] = useState<any>(null);
    const [balance, setBalance] = useState(0);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [livePools, setLivePools] = useState<{ total: number; MAIS: number; MENOS: number }>({
        total: market?.total_pool ?? 0,
        MAIS: market?.outcome_pools?.MAIS ?? 0,
        MENOS: market?.outcome_pools?.MENOS ?? 0,
    });
    const [marketStatus, setMarketStatus] = useState<string>(market?.status ?? 'OPEN');
    const [reloadCountdown, setReloadCountdown] = useState<number | null>(null);
    // Bounding boxes recebidas do servidor via Supabase Realtime Broadcast
    const [detBoxes, setDetBoxes] = useState<Array<{ id: number; cx: number; cy: number; w: number; h: number }>>([]);
    const [broadcastCount, setBroadcastCount] = useState<number | null>(null);
    const countHistory = useRef<{ t: number; v: number }[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);

    const targetCount: number = market?.metadata?.target_count ?? 100;
    const marketId: string = market?.id;

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    // ── Carrega estado inicial ─────────────────────────────────
    useEffect(() => {
        async function load() {
            const roundId = market?.metadata?.round_id;
            if (!roundId) return;

            // Rodada atual
            const { data: cur } = await supabase
                .from('rounds')
                .select('*')
                .eq('id', roundId)
                .maybeSingle();
            if (cur) setRound(cur);

            // Rodada anterior (para comparação)
            const { data: prev } = await supabase
                .from('rounds')
                .select('*')
                .eq('status', 'finished')
                .order('end_time', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (prev) setPrevRound(prev);

            // Histórico de mercados resolvidos (para history dots)
            const { data: hist } = await supabase
                .from('markets')
                .select('id, resolution_result')
                .eq('status', 'RESOLVED')
                .eq('metadata->>market_type', 'VEHICLE')
                .order('created_at', { ascending: false })
                .limit(10);
            if (hist) setHistoryMarkets(hist.reverse());

            // Aposta do usuário
            if (currentUser) {
                const { data: bet } = await supabase
                    .from('bets')
                    .select('*')
                    .eq('market_id', marketId)
                    .eq('user_id', currentUser.id)
                    .maybeSingle();
                if (bet) setUserBet(bet);

                const { data: userData } = await supabase
                    .from('users')
                    .select('balance')
                    .eq('id', currentUser.id)
                    .single();
                if (userData) setBalance(userData.balance);
            }
        }
        load();
    }, [market, currentUser, marketId]);

    // ── Realtime: atualiza contagem ────────────────────────────
    useEffect(() => {
        const roundId = market?.metadata?.round_id;
        if (!roundId) return;

        const ch = supabase
            .channel(`round-live-${roundId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `id=eq.${roundId}` },
                (payload) => {
                    const r = payload.new as any;
                    setRound(r);

                    // Registra histórico para sparkline
                    const now = Date.now();
                    countHistory.current = [
                        ...countHistory.current.filter(p => now - p.t < 5 * 60_000),
                        { t: now, v: r.actual_count ?? 0 }
                    ];
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(ch); };
    }, [market]);

    // ── Realtime: odds do mercado ─────────────────────────────
    useEffect(() => {
        const ch = supabase
            .channel(`market-vehicle-${marketId}`)
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'markets',
                filter: `id=eq.${marketId}`,
            }, (payload) => {
                const m = payload.new as any;
                setLivePools({ total: m.total_pool ?? 0, MAIS: m.outcome_pools?.MAIS ?? 0, MENOS: m.outcome_pools?.MENOS ?? 0 });
                if (m.status !== 'OPEN') setMarketStatus(m.status);
            })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [marketId]);

    // ── Realtime Broadcast: bounding boxes da IA ─────────────
    useEffect(() => {
        const roundId = market?.metadata?.round_id;
        if (!roundId) return;

        const ch = supabase
            .channel(`det-${roundId}`)
            .on('broadcast', { event: 'det' }, ({ payload }) => {
                setDetBoxes(payload.boxes ?? []);
                if (payload.count != null) setBroadcastCount(payload.count);
            })
            .subscribe();

        return () => { supabase.removeChannel(ch); };
    }, [market?.metadata?.round_id]);

    // ── Realtime: novos mercados resolvidos (history dots) ────
    useEffect(() => {
        const ch = supabase
            .channel('vehicle-hist-markets')
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'markets',
            }, (payload) => {
                const m = payload.new as any;
                if (m.status === 'RESOLVED' && m.metadata?.market_type === 'VEHICLE') {
                    setHistoryMarkets(prev => [...prev.slice(-9), { id: m.id, resolution_result: m.resolution_result }]);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, []);

    // ── Auto-reload quando mercado encerra ────────────────────
    useEffect(() => {
        if (marketStatus !== 'OPEN' && reloadCountdown === null) setReloadCountdown(10);
    }, [marketStatus]);

    useEffect(() => {
        if (reloadCountdown === null) return;
        if (reloadCountdown <= 0) { window.location.reload(); return; }
        const t = setTimeout(() => setReloadCountdown(p => (p ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [reloadCountdown]);

    // ── Contador regressivo ────────────────────────────────────
    // Usa serverNow (timestamp SSR) como referência para evitar drift do relógio do cliente.
    // elapsed = tempo decorrido desde o carregamento da página (calculado com delta, sem clock absoluto)
    // remaining = (end_date - serverNow) - elapsed
    const mountedClientAt = useRef(Date.now());
    useEffect(() => {
        if (!market?.end_date) return;
        const endMs = new Date(market.end_date).getTime();
        const referenceNow = serverNow ?? Date.now();
        const initialRemaining = endMs - referenceNow; // calculado no servidor — preciso

        const tick = () => {
            const elapsed = Date.now() - mountedClientAt.current;
            const diff = Math.max(0, initialRemaining - elapsed);
            const left = Math.ceil(diff / 1000);
            setTimeLeft(left);
            if (left === 0 && marketStatus === 'OPEN' && reloadCountdown === null) setReloadCountdown(12);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [market?.end_date, serverNow, marketStatus, reloadCountdown]);

    // ── HLS player (baixo delay) ────────────────────────────────
    useEffect(() => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        if (typeof window !== 'undefined' && (window as any).Hls?.isSupported?.()) {
            const Hls = (window as any).Hls;
            const hls = new Hls({
                lowLatencyMode: true,
                // Fica apenas 1 segmento atrás do live edge (mínimo estável)
                liveSyncDurationCount: 1,
                // Se ficar mais de 3 segmentos atrás, aumenta playback rate para alcançar
                liveMaxLatencyDurationCount: 3,
                // Reduz buffer ao mínimo
                maxBufferLength: 8,
                maxMaxBufferLength: 15,
                // Sem buffer traseiro — libera memória e reduz latência percebida
                backBufferLength: 0,
                enableWorker: true,
            });
            hls.loadSource(STREAM_URL);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                // Carrega a partir do live edge (-1)
                hls.startLoad(-1);
                video.play().catch(() => {});
            });
            // Se acumular latência (usuário pausou, aba em background, etc.) → pula para o live edge
            hls.on(Hls.Events.LEVEL_UPDATED, (_: any, data: any) => {
                if (!data.live) return;
                const liveSyncPos = hls.liveSyncPosition;
                if (liveSyncPos && video.currentTime < liveSyncPos - 20) {
                    video.currentTime = liveSyncPos;
                }
            });
            return () => hls.destroy();
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari nativo — usa #t=999999 para pular ao live edge
            video.src = STREAM_URL + '#t=999999';
            video.play().catch(() => {});
        }
    }, []);

    // ── Submete aposta ────────────────────────────────────────
    const handleBet = useCallback(async () => {
        if (!currentUser) { showToast('error', 'Faça login para participar.'); return; }
        if (!betSide) { showToast('error', 'Escolha MAIS ou MENOS.'); return; }
        const amount = parseFloat(betAmount);
        if (!amount || amount < 5) { showToast('error', 'Valor mínimo de R$ 5,00.'); return; }
        if (amount > balance) { showToast('error', 'Saldo insuficiente.'); return; }
        if (marketStatus !== 'OPEN') { showToast('error', 'Este mercado não está mais aberto.'); return; }

        setSubmitting(true);
        try {
            const { error } = await supabase.rpc('place_bet', {
                p_market_id: marketId,
                p_user_id: currentUser.id,
                p_outcome: betSide,
                p_amount: amount,
            });
            if (error) throw error;
            showToast('success', `Palpite de ${formatCurrency(amount)} em ${betSide} registrado!`);
            setUserBet({ outcome: betSide, amount });
            setBalance(prev => prev - amount);
            onBetPlaced?.();
        } catch (err: any) {
            showToast('error', err.message ?? 'Erro ao registrar palpite.');
        } finally {
            setSubmitting(false);
        }
    }, [betSide, betAmount, currentUser, marketId, balance, market, onBetPlaced]);

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    // broadcastCount vem do servidor a cada 500ms (mais imediato)
    // round.actual_count vem do banco a cada 1s (autoritativo para apostas)
    const liveCount = broadcastCount ?? round?.actual_count ?? 0;
    const pct = Math.min(100, (liveCount / targetCount) * 100);
    const isOver = liveCount > targetCount;

    const totalPool = livePools.total;
    const maisPool = livePools.MAIS;
    const menosPool = livePools.MENOS;
    const maisOddsRaw = maisPool > 0 ? totalPool / maisPool : 2;
    const menosOddsRaw = menosPool > 0 ? totalPool / menosPool : 2;
    const maisOdds = Math.max(1.0, 1 + (maisOddsRaw - 1) * 0.65).toFixed(2);
    const menosOdds = Math.max(1.0, 1 + (menosOddsRaw - 1) * 0.65).toFixed(2);

    // ── Rodada encerrada ──────────────────────────────────────
    if (marketStatus !== 'OPEN' || reloadCountdown !== null) {
        return (
            <div className="bg-surface/30 border border-white/5 rounded-2xl p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                    <Car className="w-8 h-8 text-green-400" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-lg">Rodada Encerrada</h3>
                    <p className="text-gray-500 text-sm mt-1">Próxima rodada em instantes...</p>
                </div>
                {reloadCountdown !== null && reloadCountdown > 0 && (
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Carregando nova rodada em {reloadCountdown}s
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl text-sm font-bold shadow-xl border animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-green-900/90 border-green-500/30 text-green-200' : 'bg-red-900/90 border-red-500/30 text-red-200'}`}>
                    {toast.msg}
                </div>
            )}

            {/* ── Câmera ao Vivo ─────────────────────────────────── */}
            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/5 shadow-2xl">
                {/* HLS.js precisa ser carregado externamente via CDN */}
                <script src="https://cdn.jsdelivr.net/npm/hls.js@latest" async />

                <video
                    ref={videoRef}
                    className="w-full aspect-video object-cover"
                    muted
                    playsInline
                    autoPlay
                />

                {/* Overlay SVG: linha de contagem + bounding boxes da IA
                    viewBox espelha resolução real da câmera (704×480).
                    As detecções são em espaço 640×640 normalizado (0-1),
                    mapeamos para 704×480: x_cam = cx*704, y_cam = cy*480.
                    preserveAspectRatio="xMidYMid slice" = object-cover */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 704 480"
                    preserveAspectRatio="xMidYMid slice"
                >
                    {/* Bounding boxes amarelas — cada veículo rastreado pelo servidor */}
                    {detBoxes.map(box => {
                        const x = (box.cx - box.w / 2) * 704;
                        const y = (box.cy - box.h / 2) * 480;
                        const w = box.w * 704;
                        const h = box.h * 480;
                        return (
                            <g key={box.id}>
                                <rect x={x} y={y} width={w} height={h}
                                    fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2.5" />
                                <rect x={x} y={y} width={w} height={h}
                                    fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth="1.5" />
                            </g>
                        );
                    })}

                    {/* Linha de contagem verde — y=45% da imagem 640×640 → y=216 em 480px */}
                    <line x1="35" y1="216" x2="598" y2="216"
                        stroke="rgba(0,0,0,0.5)" strokeWidth="3" />
                    <line x1="35" y1="216" x2="598" y2="216"
                        stroke="#22c55e" strokeWidth="2" />
                    <circle cx="35"  cy="216" r="4" fill="#22c55e" />
                    <circle cx="598" cy="216" r="4" fill="#22c55e" />
                    <rect x="601" y="207" width="32" height="16" rx="3" fill="rgba(0,0,0,0.6)" />
                    <text x="617" y="218" fill="#22c55e" fontSize="9" fontWeight="bold"
                        fontFamily="monospace" textAnchor="middle">IA</text>
                </svg>

                {/* Overlay de status */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-red-400 text-xs font-bold px-2.5 py-1 rounded-full border border-red-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        AO VIVO
                    </span>
                    <span className="bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/10">
                        SP-055 · KM 110A
                    </span>
                </div>

                {/* Timer overlay */}
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-sm font-mono font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </div>

                {/* Contador grande */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 py-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Veículos contabilizados</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black text-white tabular-nums">
                                    {liveCount}
                                </span>
                                <span className={`text-sm font-bold flex items-center gap-1 ${isOver ? 'text-green-400' : 'text-orange-400'}`}>
                                    {isOver ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    {isOver ? 'acima' : 'abaixo'} de {targetCount}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Rodada anterior</p>
                            <p className="text-lg font-bold text-gray-300">{prevRound?.actual_count ?? '–'} carros</p>
                        </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-green-500' : 'bg-orange-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Histórico de Rodadas + Participantes ───────────── */}
            <div className="bg-surface/30 border border-white/5 rounded-2xl p-4 space-y-4">
                {historyMarkets.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-500 mb-2 font-medium">Últimas rodadas</p>
                        <HistoryDots markets={historyMarkets} />
                    </div>
                )}
                <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" /> Participantes desta rodada
                    </p>
                    <LiveBetsFeed
                        marketId={marketId}
                        greenOutcome="MAIS"
                        labels={{ MAIS: '↑ MAIS', MENOS: '↓ MENOS' }}
                    />
                </div>
            </div>

            {/* ── Painel de Participação ──────────────────────────── */}
            {market?.status === 'OPEN' && (
                <div className="bg-[#0d1a0d] border border-primary/20 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Zap className="w-4 h-4 text-primary" />
                            Dar Palpite
                        </h3>
                        {currentUser && (
                            <span className="text-xs text-gray-500">Saldo: <span className="text-primary font-bold">{formatCurrency(balance)}</span></span>
                        )}
                    </div>

                    {userBet ? (
                        <div className="text-center py-3 bg-primary/10 rounded-xl border border-primary/20">
                            <p className="text-primary font-bold text-sm">✓ Palpite registrado: {userBet.outcome}</p>
                            <p className="text-gray-400 text-xs mt-0.5">Valor: {formatCurrency(userBet.amount)}</p>
                        </div>
                    ) : (
                        <>
                            {/* Opções */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setBetSide('MAIS')}
                                    className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${betSide === 'MAIS' ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-white/5 border-white/10 text-gray-400 hover:border-green-500/50'}`}
                                >
                                    <TrendingUp className="w-4 h-4 mx-auto mb-0.5" />
                                    MAIS de {targetCount}
                                    <span className="block text-xs font-normal mt-0.5">{maisOdds}x</span>
                                </button>
                                <button
                                    onClick={() => setBetSide('MENOS')}
                                    className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${betSide === 'MENOS' ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-white/5 border-white/10 text-gray-400 hover:border-red-500/50'}`}
                                >
                                    <TrendingDown className="w-4 h-4 mx-auto mb-0.5" />
                                    MENOS de {targetCount}
                                    <span className="block text-xs font-normal mt-0.5">{menosOdds}x</span>
                                </button>
                            </div>

                            {/* Valor */}
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="5"
                                    step="5"
                                    placeholder="R$ 0,00"
                                    value={betAmount}
                                    onChange={e => setBetAmount(e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50"
                                />
                                <button
                                    onClick={handleBet}
                                    disabled={submitting || !betSide || !betAmount}
                                    className="px-5 py-3 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-black text-sm rounded-xl transition-all"
                                >
                                    {submitting ? '...' : 'Confirmar'}
                                </button>
                            </div>

                            {/* Atalhos de valor */}
                            <div className="flex gap-2 flex-wrap">
                                {[5, 10, 20, 50].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setBetAmount(String(v))}
                                        className="text-xs px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                    >
                                        R${v}
                                    </button>
                                ))}
                            </div>

                            {!currentUser && (
                                <p className="text-center text-xs text-gray-500">
                                    <a href="/login" className="text-primary hover:underline">Faça login</a> para participar.
                                </p>
                            )}
                        </>
                    )}

                    {/* Pool info */}
                    <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-white/5">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Pool: {formatCurrency(totalPool)}</span>
                        <span>MAIS: {formatCurrency(maisPool)} · MENOS: {formatCurrency(menosPool)}</span>
                    </div>
                </div>
            )}

            {/* ── Aviso de transparência ─────────────────────────── */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200/70 leading-relaxed">
                    A contagem é realizada por inteligência artificial (YOLOv8) em câmera pública da rodovia SP-055. Pela qualidade da transmissão e desempenho da IA, alguns veículos podem não ser contabilizados. Vale exclusivamente o número computado pelo sistema.
                </p>
            </div>
        </div>
    );
}
