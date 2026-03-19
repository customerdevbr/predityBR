"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { Zap, Clock, TrendingUp, TrendingDown, Users, Bitcoin } from 'lucide-react';

interface BTCLiveMarketProps {
    market: any;
    currentUser: any;
    onBetPlaced?: () => void;
}

interface Candle {
    time: number;        // timestamp ms (aligned to 1 min)
    open: number;
    high: number;
    low: number;
    close: number;
    isLive?: boolean;    // candle atual ainda aberto
}

interface Marker {
    time: number;
    price: number;
}

const BINANCE_WS = 'wss://stream.binance.com:9443/ws/btcusdt@kline_1m';
const CANDLE_INTERVAL_MS = 60_000; // 1 minuto

// ── Mini SVG Candlestick Chart ──────────────────────────────────────────────
function CandleChart({
    candles,
    markers,
    openPrice,
    width = 600,
    height = 200,
}: {
    candles: Candle[];
    markers: Marker[];
    openPrice: number;
    width?: number;
    height?: number;
}) {
    if (candles.length === 0) return (
        <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Aguardando dados da Binance...
        </div>
    );

    const PADDING = { top: 16, right: 8, bottom: 24, left: 60 };
    const chartW = width - PADDING.left - PADDING.right;
    const chartH = height - PADDING.top - PADDING.bottom;

    const allPrices = candles.flatMap(c => [c.high, c.low]);
    const minP = Math.min(...allPrices, openPrice) * 0.9995;
    const maxP = Math.max(...allPrices, openPrice) * 1.0005;
    const range = maxP - minP || 1;

    const toY = (p: number) => PADDING.top + ((maxP - p) / range) * chartH;
    const candleW = Math.max(4, Math.floor(chartW / (candles.length + 1)) - 2);
    const toX = (i: number) => PADDING.left + (i + 0.5) * (chartW / (candles.length + 1));

    // Y axis labels
    const ySteps = 5;
    const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => minP + (range / ySteps) * i);

    return (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            {/* Grid lines */}
            {yLabels.map(p => (
                <g key={p}>
                    <line
                        x1={PADDING.left} y1={toY(p)}
                        x2={width - PADDING.right} y2={toY(p)}
                        stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                    />
                    <text
                        x={PADDING.left - 4} y={toY(p) + 4}
                        textAnchor="end" fill="#4b5563" fontSize="9"
                    >
                        {p.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </text>
                </g>
            ))}

            {/* Linha de preço de abertura do mercado */}
            <line
                x1={PADDING.left} y1={toY(openPrice)}
                x2={width - PADDING.right} y2={toY(openPrice)}
                stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,3"
            />
            <text x={width - PADDING.right + 4} y={toY(openPrice) + 4} fill="#f59e0b" fontSize="9" fontWeight="bold">
                Abertura
            </text>

            {/* Candles */}
            {candles.map((c, i) => {
                const x = toX(i);
                const isUp = c.close >= c.open;
                const color = c.isLive
                    ? (isUp ? '#22c55e' : '#ef4444')
                    : (isUp ? '#04B305' : '#ef4444');
                const bodyTop = toY(Math.max(c.open, c.close));
                const bodyH = Math.max(1, Math.abs(toY(c.open) - toY(c.close)));

                return (
                    <g key={c.time}>
                        {/* Pavio */}
                        <line
                            x1={x} y1={toY(c.high)}
                            x2={x} y2={toY(c.low)}
                            stroke={color} strokeWidth="1.5"
                            opacity={c.isLive ? 1 : 0.85}
                        />
                        {/* Corpo */}
                        <rect
                            x={x - candleW / 2}
                            y={bodyTop}
                            width={candleW}
                            height={bodyH}
                            fill={color}
                            rx="1"
                            opacity={c.isLive ? 1 : 0.85}
                        />
                        {/* Brilho no candle ao vivo */}
                        {c.isLive && (
                            <rect
                                x={x - candleW / 2}
                                y={bodyTop}
                                width={candleW}
                                height={bodyH}
                                fill={color}
                                rx="1"
                                opacity="0.3"
                                filter="url(#glow)"
                            />
                        )}
                    </g>
                );
            })}

            {/* X axis timestamps */}
            {candles.filter((_, i) => i % 2 === 0).map((c, idx) => {
                const i = idx * 2;
                const d = new Date(c.time);
                const label = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                return (
                    <text key={c.time} x={toX(i)} y={height - 6} textAnchor="middle" fill="#4b5563" fontSize="9">
                        {label}
                    </text>
                );
            })}

            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
        </svg>
    );
}

// ── Componente Principal ────────────────────────────────────────────────────
export default function BTCLiveMarket({ market, currentUser, onBetPlaced }: BTCLiveMarketProps) {
    const [candles, setCandles] = useState<Candle[]>([]);
    const [liveCandle, setLiveCandle] = useState<Candle | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [betSide, setBetSide] = useState<'SUBIU' | 'CAIU' | null>(null);
    const [betAmount, setBetAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [userBet, setUserBet] = useState<any>(null);
    const [balance, setBalance] = useState(0);
    const [wsStatus, setWsStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const openPrice: number = market?.metadata?.btc_open_price ?? 0;
    const marketId: string = market?.id;

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    // ── Carrega dados iniciais ─────────────────────────────────
    useEffect(() => {
        async function load() {
            // Histórico de candles (1m) da Binance REST
            try {
                const windowStart = market?.metadata?.btc_window_start
                    ? Math.floor(new Date(market.metadata.btc_window_start).getTime())
                    : Date.now() - 10 * CANDLE_INTERVAL_MS;

                const startTime = windowStart - 10 * CANDLE_INTERVAL_MS;
                const res = await fetch(
                    `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&startTime=${startTime}&limit=20`
                );
                if (res.ok) {
                    const raw = await res.json();
                    const parsed: Candle[] = raw.map((k: any[]) => ({
                        time: k[0],
                        open: parseFloat(k[1]),
                        high: parseFloat(k[2]),
                        low: parseFloat(k[3]),
                        close: parseFloat(k[4]),
                    }));
                    setCandles(parsed);
                    const last = parsed[parsed.length - 1];
                    if (last) setCurrentPrice(last.close);
                }
            } catch {}

            // Aposta do usuário
            if (currentUser) {
                const { data: bet } = await supabase
                    .from('bets').select('*')
                    .eq('market_id', marketId).eq('user_id', currentUser.id)
                    .maybeSingle();
                if (bet) setUserBet(bet);

                const { data: u } = await supabase
                    .from('users').select('balance').eq('id', currentUser.id).single();
                if (u) setBalance(u.balance);
            }
        }
        load();
    }, [market, currentUser, marketId]);

    // ── WebSocket Binance ──────────────────────────────────────
    useEffect(() => {
        let ws: WebSocket;

        function connect() {
            setWsStatus('connecting');
            ws = new WebSocket(BINANCE_WS);
            wsRef.current = ws;

            ws.onopen = () => setWsStatus('live');
            ws.onerror = () => setWsStatus('error');
            ws.onclose = () => {
                setWsStatus('error');
                setTimeout(connect, 3000);
            };

            ws.onmessage = (evt) => {
                try {
                    const msg = JSON.parse(evt.data);
                    const k = msg.k;
                    if (!k) return;

                    const candle: Candle = {
                        time: k.t,
                        open: parseFloat(k.o),
                        high: parseFloat(k.h),
                        low: parseFloat(k.l),
                        close: parseFloat(k.c),
                        isLive: !k.x,
                    };

                    setCurrentPrice(candle.close);

                    if (k.x) {
                        // Candle fechado → adiciona ao histórico
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
            ws?.close();
            wsRef.current = null;
        };
    }, []);

    // ── Timer regressivo ───────────────────────────────────────
    useEffect(() => {
        if (!market?.end_date) return;
        const tick = () => {
            setTimeLeft(Math.max(0, Math.ceil((new Date(market.end_date).getTime() - Date.now()) / 1000)));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [market?.end_date]);

    // ── Aposta ─────────────────────────────────────────────────
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
                p_market_id: marketId,
                p_user_id: currentUser.id,
                p_outcome: betSide,
                p_amount: amount,
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

    // ── Calculados ──────────────────────────────────────────────
    const allCandlesForChart = [...candles, ...(liveCandle ? [liveCandle] : [])];
    const priceDiff = currentPrice && openPrice ? currentPrice - openPrice : 0;
    const priceDiffPct = openPrice > 0 ? (priceDiff / openPrice) * 100 : 0;
    const isUp = priceDiff >= 0;

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    const pools = market?.outcome_pools ?? {};
    const totalPool = market?.total_pool ?? 0;
    const subiuPool = pools['SUBIU'] ?? 0;
    const aiuPool = pools['CAIU'] ?? 0;
    const subiuOddsRaw = subiuPool > 0 ? totalPool / subiuPool : 2;
    const aiuOddsRaw = aiuPool > 0 ? totalPool / aiuPool : 2;
    const subiuOdds = Math.max(1.0, 1 + (subiuOddsRaw - 1) * 0.65).toFixed(2);
    const aiuOdds = Math.max(1.0, 1 + (aiuOddsRaw - 1) * 0.65).toFixed(2);

    const fmtUSD = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="space-y-4">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl text-sm font-bold shadow-xl border animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-green-900/90 border-green-500/30 text-green-200' : 'bg-red-900/90 border-red-500/30 text-red-200'}`}>
                    {toast.msg}
                </div>
            )}

            {/* ── Cabeçalho BTC ──────────────────────────────────── */}
            <div className="bg-[#0a0f0a] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f7931a]/10 rounded-full flex items-center justify-center border border-[#f7931a]/20">
                            <Bitcoin className="w-5 h-5 text-[#f7931a]" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">BTC/USDT · Binance</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'live' ? 'bg-green-500 animate-pulse' : wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                <span className="text-xs text-gray-600">{wsStatus === 'live' ? 'AO VIVO' : wsStatus === 'connecting' ? 'Conectando...' : 'Reconectando...'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span className="font-mono font-bold text-white">
                                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Preço atual */}
                <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-4xl font-black text-white tabular-nums">
                        ${currentPrice ? fmtUSD(currentPrice) : '–'}
                    </span>
                    <div className={`flex items-center gap-1 text-base font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {isUp ? '+' : ''}{priceDiff.toFixed(2)} ({priceDiffPct >= 0 ? '+' : ''}{priceDiffPct.toFixed(3)}%)
                    </div>
                </div>

                {/* Linha de abertura */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 bg-white/5 rounded-lg px-3 py-1.5">
                    <span className="w-3 h-0.5 bg-yellow-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#f59e0b 0,#f59e0b 4px,transparent 4px,transparent 8px)' }} />
                    Abertura do mercado: <span className="font-bold text-yellow-400">${fmtUSD(openPrice)}</span>
                    <span className="ml-auto">{isUp ? '📈 Acima' : '📉 Abaixo'} da abertura</span>
                </div>

                {/* Gráfico de Candles */}
                <div className="w-full overflow-x-auto">
                    <div className="min-w-[400px]">
                        <CandleChart
                            candles={allCandlesForChart}
                            markers={[]}
                            openPrice={openPrice}
                            height={200}
                        />
                    </div>
                </div>
            </div>

            {/* ── Painel de Participação ──────────────────────────── */}
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
                                <button
                                    onClick={() => setBetSide('SUBIU')}
                                    className={`py-4 rounded-xl border-2 font-bold text-sm transition-all ${betSide === 'SUBIU' ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-white/5 border-white/10 text-gray-400 hover:border-green-500/50'}`}
                                >
                                    <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                                    SUBIU
                                    <span className="block text-xs font-normal mt-0.5">Acima de ${fmtUSD(openPrice)}</span>
                                    <span className="block text-xs text-green-400 font-bold mt-1">{subiuOdds}x</span>
                                </button>
                                <button
                                    onClick={() => setBetSide('CAIU')}
                                    className={`py-4 rounded-xl border-2 font-bold text-sm transition-all ${betSide === 'CAIU' ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-white/5 border-white/10 text-gray-400 hover:border-red-500/50'}`}
                                >
                                    <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                                    CAIU
                                    <span className="block text-xs font-normal mt-0.5">Abaixo de ${fmtUSD(openPrice)}</span>
                                    <span className="block text-xs text-red-400 font-bold mt-1">{aiuOdds}x</span>
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="number" min="5" step="5"
                                    placeholder="R$ 0,00"
                                    value={betAmount}
                                    onChange={e => setBetAmount(e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#f7931a]/50"
                                />
                                <button
                                    onClick={handleBet}
                                    disabled={submitting || !betSide || !betAmount}
                                    className="px-5 py-3 bg-[#f7931a] hover:bg-[#f7931a]/90 disabled:opacity-40 text-white font-black text-sm rounded-xl transition-all"
                                >
                                    {submitting ? '...' : 'Confirmar'}
                                </button>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                {[5, 10, 25, 50].map(v => (
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

                    <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-white/5">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Pool: {formatCurrency(totalPool)}</span>
                        <span>↑ {formatCurrency(subiuPool)} · ↓ {formatCurrency(aiuPool)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
