"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Zap, Clock, TrendingUp, TrendingDown, Users, Bitcoin } from 'lucide-react';

interface BTCLiveMarketProps {
    market: any;
    currentUser: any;
    onBetPlaced?: () => void;
    serverNow?: number;
}

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    isLive?: boolean;
}

interface Marker { time: number; price: number; }

const BINANCE_WS = 'wss://stream.binance.com:9443/ws/btcusdt@kline_1m';
const KRAKEN_REST = 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD';
const FLASH_INTERVAL_MS = 5_000;

// ── Keyframes injetados uma vez ──────────────────────────────────────────────
const ANIM_STYLES = `
@keyframes btcBurstUp {
  0%   { opacity: 0; transform: scale(0.5); }
  20%  { opacity: 1; transform: scale(1.02); }
  100% { opacity: 0; transform: scale(1.5); }
}
@keyframes btcBurstDown {
  0%   { opacity: 0; transform: scale(0.5); }
  20%  { opacity: 1; transform: scale(1.02); }
  100% { opacity: 0; transform: scale(1.5); }
}
@keyframes btcRingUp {
  0%   { opacity: 0.7; transform: scale(0.6); }
  100% { opacity: 0;   transform: scale(2.2); }
}
@keyframes btcRingDown {
  0%   { opacity: 0.7; transform: scale(0.6); }
  100% { opacity: 0;   transform: scale(2.2); }
}
@keyframes btcPriceTick {
  0%   { transform: translateY(0) scale(1); }
  30%  { transform: translateY(-6px) scale(1.06); }
  60%  { transform: translateY(2px) scale(0.97); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes btcCandlePulse {
  0%, 100% { filter: drop-shadow(0 0 3px currentColor); }
  50%       { filter: drop-shadow(0 0 10px currentColor); }
}
`;

// ── CandleChart com live candle animado ──────────────────────────────────────
function CandleChart({
    candles,
    openPrice,
    flashDir,
    width = 600,
    height = 200,
}: {
    candles: Candle[];
    openPrice: number;
    flashDir: 'up' | 'down' | null;
    width?: number;
    height?: number;
}) {
    if (candles.length === 0) return (
        <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Aguardando dados...
        </div>
    );

    const PADDING = { top: 18, right: 10, bottom: 26, left: 62 };
    const chartW = width - PADDING.left - PADDING.right;
    const chartH = height - PADDING.top - PADDING.bottom;

    const allPrices = candles.flatMap(c => [c.high, c.low]);
    const minP = Math.min(...allPrices, openPrice) * 0.9994;
    const maxP = Math.max(...allPrices, openPrice) * 1.0006;
    const range = maxP - minP || 1;

    const toY = (p: number) => PADDING.top + ((maxP - p) / range) * chartH;
    const candleW = Math.max(4, Math.floor(chartW / (candles.length + 1)) - 2);
    const toX = (i: number) => PADDING.left + (i + 0.5) * (chartW / (candles.length + 1));

    const ySteps = 5;
    const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => minP + (range / ySteps) * i);

    const liveCandle = candles[candles.length - 1];
    const liveColor = liveCandle && liveCandle.isLive
        ? (liveCandle.close >= liveCandle.open ? '#22c55e' : '#ef4444')
        : null;

    // Burst overlay color
    const burstColor = flashDir === 'up'
        ? 'rgba(34,197,94,0.18)'
        : 'rgba(239,68,68,0.18)';

    return (
        <div className="relative w-full overflow-x-auto">
            {/* Flash burst overlay */}
            {flashDir && (
                <div
                    key={`burst-${Date.now()}`}
                    className="absolute inset-0 rounded-xl pointer-events-none z-10"
                    style={{
                        background: `radial-gradient(ellipse at 50% 45%, ${burstColor} 0%, transparent 70%)`,
                        animation: `btcBurst${flashDir === 'up' ? 'Up' : 'Down'} 1.3s ease-out forwards`,
                    }}
                />
            )}
            {flashDir && (
                <div
                    className="absolute inset-0 rounded-xl border-2 pointer-events-none z-10"
                    style={{
                        borderColor: flashDir === 'up' ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)',
                        animation: `btcRing${flashDir === 'up' ? 'Up' : 'Down'} 1.0s ease-out forwards`,
                    }}
                />
            )}
            <div className="min-w-[400px]">
                <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                    <defs>
                        <filter id="glow-up">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <filter id="glow-down">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <linearGradient id="candleGradUp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4ade80" />
                            <stop offset="100%" stopColor="#16a34a" />
                        </linearGradient>
                        <linearGradient id="candleGradDown" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f87171" />
                            <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                    </defs>

                    {/* Grid */}
                    {yLabels.map(p => (
                        <g key={p}>
                            <line
                                x1={PADDING.left} y1={toY(p)}
                                x2={width - PADDING.right} y2={toY(p)}
                                stroke="rgba(255,255,255,0.04)" strokeWidth="1"
                            />
                            <text x={PADDING.left - 5} y={toY(p) + 4}
                                textAnchor="end" fill="#374151" fontSize="9">
                                {p.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </text>
                        </g>
                    ))}

                    {/* Linha de abertura */}
                    <line
                        x1={PADDING.left} y1={toY(openPrice)}
                        x2={width - PADDING.right} y2={toY(openPrice)}
                        stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.7"
                    />
                    <text x={width - PADDING.right + 5} y={toY(openPrice) + 4}
                        fill="#f59e0b" fontSize="9" fontWeight="bold">Abertura</text>

                    {/* Candles */}
                    {candles.map((c, i) => {
                        const x = toX(i);
                        const isUp = c.close >= c.open;
                        const isLive = !!c.isLive;
                        const color = isUp ? '#22c55e' : '#ef4444';
                        const gradId = isUp ? 'candleGradUp' : 'candleGradDown';
                        const bodyTop = toY(Math.max(c.open, c.close));
                        const bodyH = Math.max(1.5, Math.abs(toY(c.open) - toY(c.close)));

                        return (
                            <g key={c.time} style={isLive ? { animation: 'btcCandlePulse 1.5s ease-in-out infinite', color } : undefined}>
                                {/* Pavio */}
                                <line
                                    x1={x} y1={toY(c.high)}
                                    x2={x} y2={toY(c.low)}
                                    stroke={color} strokeWidth={isLive ? 2 : 1.5}
                                    filter={isLive ? (isUp ? 'url(#glow-up)' : 'url(#glow-down)') : undefined}
                                />
                                {/* Corpo */}
                                <rect
                                    x={x - candleW / 2} y={bodyTop}
                                    width={candleW} height={bodyH}
                                    fill={isLive ? color : `url(#${gradId})`}
                                    rx="1.5"
                                    opacity={isLive ? 1 : 0.88}
                                    filter={isLive ? (isUp ? 'url(#glow-up)' : 'url(#glow-down)') : undefined}
                                />
                                {/* Dot pulsante no topo do candle ao vivo */}
                                {isLive && (
                                    <circle
                                        cx={x} cy={toY(Math.max(c.open, c.close))}
                                        r="3.5" fill={color} opacity="0.9"
                                        style={{ animation: 'btcCandlePulse 0.8s ease-in-out infinite' }}
                                    />
                                )}
                            </g>
                        );
                    })}

                    {/* X axis */}
                    {candles.filter((_, i) => i % 2 === 0).map((c, idx) => {
                        const i = idx * 2;
                        const d = new Date(c.time);
                        const label = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                        return (
                            <text key={c.time} x={toX(i)} y={height - 6}
                                textAnchor="middle" fill="#374151" fontSize="9">{label}</text>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}

// ── HistoryDots ──────────────────────────────────────────────────────────────
function HistoryDots({ markets }: { markets: Array<{ id: string; resolution_result?: string }> }) {
    if (!markets.length) return null;
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {markets.map(m => {
                const isUp = m.resolution_result === 'SUBIU';
                return (
                    <span key={m.id} title={isUp ? 'SUBIU' : 'CAIU'}
                        className={`w-3 h-3 rounded-full border ${isUp ? 'bg-green-500 border-green-400' : 'bg-red-500 border-red-400'}`} />
                );
            })}
        </div>
    );
}

// ── LiveBetsFeed ─────────────────────────────────────────────────────────────
function LiveBetsFeed({ marketId, greenOutcome, labels, max = 6 }: {
    marketId: string; greenOutcome: string; labels: Record<string, string>; max?: number;
}) {
    const [bets, setBets] = useState<Array<{ id: string; outcome: string; amount: number }>>([]);

    useEffect(() => {
        supabase.from('bets').select('id, outcome, amount, created_at')
            .eq('market_id', marketId).order('created_at', { ascending: false }).limit(max)
            .then(({ data }) => { if (data) setBets(data.reverse()); });

        const ch = supabase.channel(`bets-feed-btc-${marketId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets', filter: `market_id=eq.${marketId}` },
                (payload) => {
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
                    <span className="text-gray-300">{b.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
            ))}
        </div>
    );
}

// ── Componente Principal ─────────────────────────────────────────────────────
export default function BTCLiveMarket({ market, currentUser, onBetPlaced, serverNow }: BTCLiveMarketProps) {
    const [candles, setCandles] = useState<Candle[]>([]);
    const [liveCandle, setLiveCandle] = useState<Candle | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [betSide, setBetSide] = useState<'SUBIU' | 'CAIU' | null>(null);
    const [betAmount, setBetAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [userBet, setUserBet] = useState<any>(null);
    const [balance, setBalance] = useState(0);
    const [wsStatus, setWsStatus] = useState<'connecting' | 'live' | 'fallback' | 'error'>('connecting');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [livePools, setLivePools] = useState<{ total: number; SUBIU: number; CAIU: number }>({
        total: market?.total_pool ?? 0, SUBIU: market?.outcome_pools?.SUBIU ?? 0, CAIU: market?.outcome_pools?.CAIU ?? 0,
    });
    const [marketStatus, setMarketStatus] = useState<string>(market?.status ?? 'OPEN');
    const [reloadCountdown, setReloadCountdown] = useState<number | null>(
        market?.status !== 'OPEN' ? 10 : null
    );
    const [historyMarkets, setHistoryMarkets] = useState<any[]>([]);

    // ── Flash animation state ─────────────────────────────────
    const [flashDir, setFlashDir] = useState<'up' | 'down' | null>(null);
    const [flashKey, setFlashKey] = useState(0);
    const [priceAnimKey, setPriceAnimKey] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const mountedClientAt = useRef(Date.now());
    const latestPriceRef = useRef<number | null>(null);
    const snapshotPriceRef = useRef<number | null>(null);
    const wsFailCountRef = useRef(0);
    const krakenPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const openPrice: number = market?.metadata?.btc_open_price ?? 0;
    const marketId: string = market?.id;

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    // ── Carrega dados iniciais ────────────────────────────────
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=15');
                if (res.ok) {
                    const raw = await res.json();
                    const parsed: Candle[] = raw.map((k: any[]) => ({
                        time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
                        low: parseFloat(k[3]), close: parseFloat(k[4]),
                    }));
                    setCandles(parsed);
                    const last = parsed[parsed.length - 1];
                    if (last) {
                        setCurrentPrice(last.close);
                        latestPriceRef.current = last.close;
                        snapshotPriceRef.current = last.close;
                    }
                }
            } catch {}

            try {
                const { data: hist } = await supabase
                    .from('markets').select('id, resolution_result')
                    .eq('status', 'RESOLVED').eq('metadata->>market_type', 'BTC')
                    .order('created_at', { ascending: false }).limit(10);
                if (hist) setHistoryMarkets(hist.reverse());
            } catch {}

            if (currentUser) {
                const { data: bet } = await supabase.from('bets').select('*')
                    .eq('market_id', marketId).eq('user_id', currentUser.id).maybeSingle();
                if (bet) setUserBet(bet);
                const { data: u } = await supabase.from('users').select('balance').eq('id', currentUser.id).single();
                if (u) setBalance(u.balance);
            }
        }
        load();
    }, [market, currentUser, marketId]);

    // ── Flash a cada 5 segundos comparando preço ─────────────
    useEffect(() => {
        const id = setInterval(() => {
            const curr = latestPriceRef.current;
            const prev = snapshotPriceRef.current;
            if (curr === null || prev === null) return;

            const dir: 'up' | 'down' = curr >= prev ? 'up' : 'down';
            setFlashDir(dir);
            setFlashKey(k => k + 1);
            setPriceAnimKey(k => k + 1);
            setTimeout(() => setFlashDir(null), 1400);

            snapshotPriceRef.current = curr;
        }, FLASH_INTERVAL_MS);

        return () => clearInterval(id);
    }, []);

    // ── Fallback Kraken REST (ativa se Binance falhar) ────────
    const startKrakenPoll = useCallback(() => {
        if (krakenPollRef.current) return;
        setWsStatus('fallback');
        krakenPollRef.current = setInterval(async () => {
            try {
                const res = await fetch(KRAKEN_REST, { cache: 'no-store' });
                if (!res.ok) return;
                const json = await res.json();
                const pair = json.result?.XXBTZUSD;
                if (!pair) return;
                const price = parseFloat(pair.c[0]);
                if (!isNaN(price)) {
                    setCurrentPrice(price);
                    latestPriceRef.current = price;
                }
            } catch {}
        }, 5000);
    }, []);

    const stopKrakenPoll = useCallback(() => {
        if (krakenPollRef.current) {
            clearInterval(krakenPollRef.current);
            krakenPollRef.current = null;
        }
    }, []);

    // ── WebSocket Binance ─────────────────────────────────────
    useEffect(() => {
        let ws: WebSocket;
        let destroyed = false;

        function connect() {
            if (destroyed) return;
            setWsStatus('connecting');
            ws = new WebSocket(BINANCE_WS);
            wsRef.current = ws;

            ws.onopen = () => {
                wsFailCountRef.current = 0;
                setWsStatus('live');
                stopKrakenPoll();
            };

            ws.onerror = () => setWsStatus('error');

            ws.onclose = () => {
                if (destroyed) return;
                wsFailCountRef.current += 1;
                setWsStatus('error');
                if (wsFailCountRef.current >= 3) {
                    // Binance falhou 3x → ativa Kraken como fallback
                    startKrakenPoll();
                    // Tenta reconectar Binance a cada 30s
                    setTimeout(connect, 30_000);
                } else {
                    setTimeout(connect, 3_000);
                }
            };

            ws.onmessage = (evt) => {
                try {
                    const msg = JSON.parse(evt.data);
                    const k = msg.k;
                    if (!k) return;

                    const candle: Candle = {
                        time: k.t,
                        open: parseFloat(k.o), high: parseFloat(k.h),
                        low: parseFloat(k.l), close: parseFloat(k.c),
                        isLive: !k.x,
                    };

                    latestPriceRef.current = candle.close;
                    setCurrentPrice(candle.close);

                    if (k.x) {
                        setCandles(prev => {
                            const updated = prev.filter(c => c.time !== candle.time);
                            return [...updated, { ...candle, isLive: false }].slice(-20);
                        });
                        setLiveCandle(null);
                    } else {
                        setLiveCandle(candle);
                    }
                } catch {}
            };
        }

        connect();
        return () => {
            destroyed = true;
            ws?.close();
            wsRef.current = null;
            stopKrakenPoll();
        };
    }, [startKrakenPoll, stopKrakenPoll]);

    // ── Realtime: pools + status ──────────────────────────────
    useEffect(() => {
        const channel = supabase.channel(`market-btc-${marketId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${marketId}` },
                (payload) => {
                    const m = payload.new as any;
                    setLivePools({ total: m.total_pool ?? 0, SUBIU: m.outcome_pools?.SUBIU ?? 0, CAIU: m.outcome_pools?.CAIU ?? 0 });
                    if (m.status !== 'OPEN') setMarketStatus(m.status);
                })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [marketId]);

    // ── Realtime: history dots ────────────────────────────────
    useEffect(() => {
        const ch = supabase.channel('btc-hist-markets')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'markets' },
                (payload) => {
                    const m = payload.new as any;
                    if (m.status === 'RESOLVED' && m.metadata?.market_type === 'BTC') {
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
        const t = setTimeout(() => setReloadCountdown(prev => (prev ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [reloadCountdown]);

    // ── Timer regressivo ──────────────────────────────────────
    useEffect(() => {
        if (!market?.end_date) return;
        const endMs = new Date(market.end_date).getTime();
        const referenceNow = serverNow ?? Date.now();
        const initialRemaining = endMs - referenceNow;

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

    // ── Aposta ────────────────────────────────────────────────
    const handleBet = useCallback(async () => {
        if (!currentUser) { showToast('error', 'Faça login para participar.'); return; }
        if (!betSide) { showToast('error', 'Escolha SUBIU ou CAIU.'); return; }
        const amount = parseFloat(betAmount);
        if (!amount || amount < 5) { showToast('error', 'Valor mínimo de R$ 5,00.'); return; }
        if (amount > balance) { showToast('error', 'Saldo insuficiente.'); return; }
        if (market?.status !== 'OPEN') { showToast('error', 'Este mercado não está mais aberto.'); return; }

        setSubmitting(true);
        try {
            const { error } = await supabase.rpc('place_bet', {
                p_market_id: marketId, p_user_id: currentUser.id,
                p_outcome: betSide, p_amount: amount,
            });
            if (error) throw error;
            showToast('success', `Palpite de ${formatCurrency(amount)} em BTC ${betSide}!`);
            setUserBet({ outcome: betSide, amount });
            setBalance(prev => prev - amount);
            onBetPlaced?.();
        } catch (err: any) {
            showToast('error', err.message ?? 'Erro ao registrar palpite.');
        } finally {
            setSubmitting(false);
        }
    }, [betSide, betAmount, currentUser, marketId, balance, market, onBetPlaced]);

    // ── Calculados ────────────────────────────────────────────
    const allCandlesForChart = [...candles, ...(liveCandle ? [liveCandle] : [])];
    const priceDiff = currentPrice && openPrice ? currentPrice - openPrice : 0;
    const priceDiffPct = openPrice > 0 ? (priceDiff / openPrice) * 100 : 0;
    const isUp = priceDiff >= 0;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const totalPool = livePools.total;
    const subiuPool = livePools.SUBIU;
    const aiuPool = livePools.CAIU;
    const subiuOddsRaw = subiuPool > 0 ? totalPool / subiuPool : 2;
    const aiuOddsRaw = aiuPool > 0 ? totalPool / aiuPool : 2;
    const subiuOdds = Math.max(1.0, 1 + (subiuOddsRaw - 1) * 0.65).toFixed(2);
    const aiuOdds = Math.max(1.0, 1 + (aiuOddsRaw - 1) * 0.65).toFixed(2);
    const fmtUSD = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ── Rodada encerrada ──────────────────────────────────────
    if (marketStatus !== 'OPEN' || reloadCountdown !== null) {
        return (
            <div className="bg-[#0a0f0a] border border-white/5 rounded-2xl p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-[#f7931a]/10 rounded-full flex items-center justify-center mx-auto border border-[#f7931a]/20">
                    <Bitcoin className="w-8 h-8 text-[#f7931a]" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-lg">Rodada Encerrada</h3>
                    <p className="text-gray-500 text-sm mt-1">
                        {marketStatus === 'RESOLVED' ? 'Resultado computado. ' : ''}
                        Próxima rodada em instantes...
                    </p>
                </div>
                {reloadCountdown !== null && reloadCountdown > 0 && (
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                        <div className="w-2 h-2 rounded-full bg-[#f7931a] animate-pulse" />
                        Carregando nova rodada em {reloadCountdown}s
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Inject keyframes */}
            <style>{ANIM_STYLES}</style>

            {/* Toast */}
            {toast && (
                <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl text-sm font-bold shadow-xl border animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-green-900/90 border-green-500/30 text-green-200' : 'bg-red-900/90 border-red-500/30 text-red-200'}`}>
                    {toast.msg}
                </div>
            )}

            {/* ── Cabeçalho BTC ──────────────────────────────── */}
            <div className="bg-[#0a0f0a] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f7931a]/10 rounded-full flex items-center justify-center border border-[#f7931a]/20">
                            <Bitcoin className="w-5 h-5 text-[#f7931a]" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">BTC/USDT · Binance</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    wsStatus === 'live' ? 'bg-green-500 animate-pulse'
                                    : wsStatus === 'fallback' ? 'bg-yellow-500 animate-pulse'
                                    : wsStatus === 'connecting' ? 'bg-yellow-400'
                                    : 'bg-red-500'
                                }`} />
                                <span className="text-xs text-gray-600">
                                    {wsStatus === 'live' ? 'AO VIVO'
                                    : wsStatus === 'fallback' ? 'Kraken (fallback)'
                                    : wsStatus === 'connecting' ? 'Conectando...'
                                    : 'Reconectando...'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`flex items-center gap-1.5 text-sm ${timeLeft <= 30 && timeLeft > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span className={`font-mono font-bold ${timeLeft <= 30 && timeLeft > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Preço atual com animação no tick */}
                <div className="flex items-baseline gap-3 mb-4">
                    <span
                        key={priceAnimKey}
                        className="text-4xl font-black text-white tabular-nums"
                        style={{ animation: priceAnimKey > 0 ? 'btcPriceTick 0.5s ease-out' : undefined }}
                    >
                        ${currentPrice ? fmtUSD(currentPrice) : '–'}
                    </span>
                    <div className={`flex items-center gap-1 text-base font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {isUp ? '+' : ''}{priceDiff.toFixed(2)} ({priceDiffPct >= 0 ? '+' : ''}{priceDiffPct.toFixed(3)}%)
                    </div>
                </div>

                {/* Linha de abertura */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 bg-white/5 rounded-lg px-3 py-1.5">
                    <span className="w-3 h-0.5" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#f59e0b 0,#f59e0b 4px,transparent 4px,transparent 8px)' }} />
                    Abertura: <span className="font-bold text-yellow-400">${fmtUSD(openPrice)}</span>
                    <span className="ml-auto">{isUp ? '📈 Acima' : '📉 Abaixo'} da abertura</span>
                </div>

                {/* Gráfico com flash overlay */}
                <div className="relative">
                    <CandleChart
                        key={flashKey}
                        candles={allCandlesForChart}
                        openPrice={openPrice}
                        flashDir={flashDir}
                        height={200}
                    />
                </div>

                {/* Histórico + participantes */}
                <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
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
                        <LiveBetsFeed marketId={marketId} greenOutcome="SUBIU" labels={{ SUBIU: '↑ SUBIU', CAIU: '↓ CAIU' }} />
                    </div>
                </div>
            </div>

            {/* ── Painel de Participação ──────────────────────── */}
            {market?.status === 'OPEN' && (
                <div className="bg-[#0a0f0a] border border-[#f7931a]/20 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Zap className="w-4 h-4 text-[#f7931a]" />
                            Dar Palpite
                        </h3>
                        {currentUser && (
                            <span className="text-xs text-gray-500">Saldo: <span className="text-primary font-bold">{formatCurrency(balance)}</span></span>
                        )}
                    </div>

                    {userBet ? (
                        <div className="text-center py-3 bg-primary/10 rounded-xl border border-primary/20">
                            <p className="text-primary font-bold text-sm">✓ Palpite registrado: BTC {userBet.outcome}</p>
                            <p className="text-gray-400 text-xs mt-0.5">Valor: {formatCurrency(userBet.amount)}</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setBetSide('SUBIU')}
                                    className={`py-4 rounded-xl border-2 font-bold text-sm transition-all ${betSide === 'SUBIU' ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-white/5 border-white/10 text-gray-400 hover:border-green-500/50'}`}>
                                    <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                                    SUBIU
                                    <span className="block text-xs font-normal mt-0.5">Acima de ${fmtUSD(openPrice)}</span>
                                    <span className="block text-xs text-green-400 font-bold mt-1">{subiuOdds}x</span>
                                </button>
                                <button onClick={() => setBetSide('CAIU')}
                                    className={`py-4 rounded-xl border-2 font-bold text-sm transition-all ${betSide === 'CAIU' ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-white/5 border-white/10 text-gray-400 hover:border-red-500/50'}`}>
                                    <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                                    CAIU
                                    <span className="block text-xs font-normal mt-0.5">Abaixo de ${fmtUSD(openPrice)}</span>
                                    <span className="block text-xs text-red-400 font-bold mt-1">{aiuOdds}x</span>
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <input type="number" min="5" step="5" placeholder="R$ 0,00"
                                    value={betAmount} onChange={e => setBetAmount(e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#f7931a]/50" />
                                <button onClick={handleBet} disabled={submitting || !betSide || !betAmount}
                                    className="px-5 py-3 bg-[#f7931a] hover:bg-[#f7931a]/90 disabled:opacity-40 text-white font-black text-sm rounded-xl transition-all">
                                    {submitting ? '...' : 'Confirmar'}
                                </button>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                {[5, 10, 25, 50].map(v => (
                                    <button key={v} onClick={() => setBetAmount(String(v))}
                                        className="text-xs px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
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

                    <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-white/5">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Pool: {formatCurrency(totalPool)}</span>
                        <span>↑ {formatCurrency(subiuPool)} · ↓ {formatCurrency(aiuPool)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
