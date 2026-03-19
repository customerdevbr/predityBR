import { createClient } from '@/lib/supabase/server';
import BTCLiveMarket from '@/components/BTCLiveMarket';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Bitcoin, ArrowLeft } from 'lucide-react';
import BTCNoMarket from './BTCNoMarket';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'BTC ao Vivo — Sobe ou Desce?',
    description:
        'Mercado ao vivo: preveja se o Bitcoin vai subir ou cair nos próximos 5 minutos. Candles em tempo real via Binance. Resultado automático, pagamento via PIX.',
};

export default async function BTCMarketPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Mercado BTC atualmente aberto
    const { data: market } = await supabase
        .from('markets')
        .select('*')
        .eq('status', 'OPEN')
        .eq('metadata->>market_type', 'BTC')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Histórico das últimas 5 rodadas BTC
    const { data: history } = await supabase
        .from('markets')
        .select('id, title, resolution_result, metadata, created_at')
        .eq('status', 'RESOLVED')
        .eq('metadata->>market_type', 'BTC')
        .order('created_at', { ascending: false })
        .limit(8);

    return (
        <div className="min-h-screen pt-20 pb-32 md:pb-8">
            <div className="container mx-auto px-4 max-w-2xl space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3 pt-4">
                    <Link href="/markets" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f7931a]/10 rounded-full flex items-center justify-center border border-[#f7931a]/20">
                            <Bitcoin className="w-5 h-5 text-[#f7931a]" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white">BTC ao Vivo</h1>
                            <p className="text-xs text-gray-500">Rodada de 5 min · Binance · 09h–20h BRT</p>
                        </div>
                    </div>
                </div>

                {/* Mercado ativo */}
                {market ? (
                    <BTCLiveMarket
                        market={market}
                        currentUser={session?.user ?? null}
                        serverNow={Date.now()}
                    />
                ) : (
                    <BTCNoMarket />
                )}

                {/* Histórico */}
                {history && history.length > 0 && (
                    <div className="bg-surface/20 border border-white/5 rounded-2xl p-4 space-y-3">
                        <h3 className="text-sm font-bold text-white">Últimas Rodadas BTC</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {history.map((m) => {
                                const openP = m.metadata?.btc_open_price;
                                const closeP = m.metadata?.btc_close_price;
                                const isUp = m.resolution_result === 'SUBIU';
                                const diff = openP && closeP ? closeP - openP : null;
                                const pct = openP && closeP ? ((closeP - openP) / openP * 100) : null;
                                return (
                                    <div key={m.id} className="text-xs py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                                        <div className={`font-bold text-sm mb-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                            {isUp ? '↑ SUBIU' : '↓ CAIU'}
                                        </div>
                                        {openP && <div className="text-gray-500">Abertura: ${openP.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>}
                                        {pct !== null && (
                                            <div className={`font-bold mt-0.5 ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {pct >= 0 ? '+' : ''}{pct.toFixed(3)}%
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Regras resumidas */}
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
                    <p className="font-bold text-gray-300 text-sm mb-2">Como funciona</p>
                    <p>• Cada rodada dura <strong className="text-white">5 minutos</strong>. O preço de abertura é capturado da Binance no início do período.</p>
                    <p>• <strong className="text-white">SUBIU</strong>: preço de fechamento <strong>acima</strong> do preço de abertura.</p>
                    <p>• <strong className="text-white">CAIU</strong>: preço de fechamento <strong>igual ou abaixo</strong> do preço de abertura.</p>
                    <p>• Dados em tempo real via Binance. O resultado é baseado exclusivamente no preço computado pelo sistema.</p>
                    <p>• Horário de funcionamento: <strong className="text-white">09h–20h BRT</strong>. Rodadas param automaticamente fora deste horário.</p>
                    <p>• Odds dinâmicas formadas pelo pool de participantes. Sem spreads ocultos.</p>
                </div>
            </div>
        </div>
    );
}
