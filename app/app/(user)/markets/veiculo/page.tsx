import { createClient } from '@/lib/supabase/server';
import VehicleCounterLive from '@/components/VehicleCounterLive';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Car, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Câmera Ao Vivo — Contador de Veículos',
    description:
        'Mercado ao vivo: a IA conta veículos em câmera pública da rodovia SP-055 KM 136 (São Sebastião). Novo mercado a cada 5 minutos. Resultado automático, pagamento via PIX.',
};

export default async function VeiculoMarketPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Busca o mercado de veículos atualmente aberto
    const { data: market } = await supabase
        .from('markets')
        .select('*')
        .eq('status', 'OPEN')
        .eq('metadata->>market_type', 'VEHICLE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Histórico das últimas 5 rodadas resolvidas
    const { data: history } = await supabase
        .from('markets')
        .select('id, title, resolution_result, metadata, created_at')
        .eq('status', 'RESOLVED')
        .eq('metadata->>market_type', 'VEHICLE')
        .order('created_at', { ascending: false })
        .limit(5);

    return (
        <div className="min-h-screen pt-20 pb-32 md:pb-8">
            <div className="container mx-auto px-4 max-w-2xl space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3 pt-4">
                    <Link href="/markets" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                            <Car className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white">Câmera Ao Vivo</h1>
                            <p className="text-xs text-gray-500">Rodada de 5 min · SP-055 KM 136 · São Sebastião · 09h–20h BRT</p>
                        </div>
                    </div>
                </div>

                {/* Mercado ativo */}
                {market ? (
                    <VehicleCounterLive
                        key={market.id}
                        market={market}
                        currentUser={session?.user ?? null}
                        serverNow={Date.now()}
                    />
                ) : (
                    <div className="bg-surface/30 border border-white/5 rounded-2xl p-8 text-center space-y-3">
                        <Car className="w-12 h-12 text-gray-600 mx-auto" />
                        <h2 className="text-white font-bold">Nenhuma rodada ativa no momento</h2>
                        <p className="text-gray-500 text-sm">
                            O mercado funciona de <strong>09h às 20h</strong>, horário de Brasília.
                            Novas rodadas iniciam automaticamente a cada 5 minutos quando o contador está ativo.
                        </p>
                    </div>
                )}

                {/* Histórico de rodadas */}
                {history && history.length > 0 && (
                    <div className="bg-surface/20 border border-white/5 rounded-2xl p-4 space-y-3">
                        <h3 className="text-sm font-bold text-white">Últimas Rodadas</h3>
                        <div className="space-y-2">
                            {history.map((m) => {
                                const actual = m.metadata?.actual_count ?? '–';
                                const target = m.metadata?.target_count ?? '–';
                                const isMore = m.resolution_result === 'MAIS';
                                return (
                                    <div key={m.id} className="flex items-center justify-between text-xs py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                                        <span className="text-gray-400">Meta: <strong className="text-white">{target}</strong></span>
                                        <span className="text-gray-400">Real: <strong className="text-white">{actual}</strong></span>
                                        <span className={`font-bold px-2 py-0.5 rounded-full ${isMore ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                            {m.resolution_result}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Regras resumidas */}
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
                    <p className="font-bold text-gray-300 text-sm mb-2">Como funciona</p>
                    <p>• IA (YOLOv8) conta veículos cruzando a linha na câmera da SP-055 KM 136 (São Sebastião).</p>
                    <p>• Cada rodada dura <strong className="text-white">5 minutos</strong>. A meta é definida com base no resultado arredondado da rodada anterior.</p>
                    <p>• Resultado: se passaram <strong className="text-white">mais</strong> ou <strong className="text-white">menos</strong> veículos que a meta.</p>
                    <p>• A próxima meta é o resultado atual arredondado para a dezena acima (ex: 87 → próxima meta: 90).</p>
                    <p>⚠️ Pela qualidade da stream e desempenho da IA, alguns veículos podem não ser contabilizados. Vale exclusivamente o número computado pelo sistema.</p>
                </div>
            </div>
        </div>
    );
}
