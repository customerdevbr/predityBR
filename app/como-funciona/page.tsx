import Link from 'next/link';
import { ArrowRight, CheckCircle, Coins, Percent, TrendingUp, Users, ShieldCheck, Banknote, Info } from 'lucide-react';

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-[#0d1117] text-white">
            {/* Header / Hero */}
            <div className="bg-surface border-b border-white/5 py-20">
                <div className="container mx-auto px-4 text-center max-w-3xl">
                    <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                        Como funciona o Predity?
                    </h1>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        Entenda nossa lógica de <strong>Pool Coletivo e Odds Dinâmicas</strong>, taxas transparentes e porque jamais pagamos mais do que o pool acumulado.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16 max-w-4xl space-y-20">

                {/* 1. O Conceito do Pool */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(47,124,70,0.2)]">
                            <Users className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">1. Pool Coletivo — Você joga contra outros</h2>
                    </div>

                    <div className="prose prose-invert max-w-none text-gray-300 text-lg leading-relaxed">
                        <p>
                            No <strong>Predity</strong>, você não joga contra a casa. Você joga <strong className="text-white">contra outros usuários</strong>.
                            Todo valor apostado vai para um cofre comum (Pool). Quem acerta o resultado, divide proporcionalmente o que foi aportado por quem errou.
                        </p>
                    </div>
                </section>

                {/* 2. A Matemática Correta */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <TrendingUp className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">2. A Matemática das Odds (35% de comissão)</h2>
                    </div>

                    <div className="prose prose-invert max-w-none text-gray-300 text-lg leading-relaxed space-y-4">
                        <p>
                            A plataforma retém <strong className="text-yellow-400">35% do pool total</strong> como comissão de operação. Os outros <strong className="text-emerald-400">65%</strong> é o prêmio disponível para os vencedores.
                            As odds são calculadas com base nesse prêmio distribuível:
                        </p>

                        <div className="bg-[#151921] border border-white/10 p-6 rounded-xl font-mono text-center text-xl text-yellow-400 my-6 shadow-inner space-y-3">
                            <div>Prêmio Distribuível = Pool Total × 65%</div>
                            <div className="text-gray-500 text-sm">────────────────────────────────</div>
                            <div>Odd = Prêmio Distribuível ÷ Pool do Seu Lado</div>
                        </div>

                        <p>
                            <strong>Por que isso é bom?</strong>
                        </p>
                        <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                            <li>As odds refletem a opinião do público em tempo real — quanto mais gente escolhe um lado, menor a odd (e o lucro) daquele lado.</li>
                            <li>Apostar na zebra (lado com pouco dinheiro) paga proporcionalmente muito mais.</li>
                            <li>Nunca pagamos mais do que os 65% do pool — a plataforma é sempre sustentável.</li>
                        </ul>
                    </div>
                </section>

                {/* 3. Taxas */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">3. Taxas e Pagamentos</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-[#151921] border border-white/10 p-6 rounded-2xl hover:border-primary/50 transition-colors">
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Comissão da Casa</div>
                            <div className="text-4xl font-black text-yellow-400 mb-2">35%</div>
                            <p className="text-sm text-gray-400">
                                Retida sobre o <strong>pool total arrecadado</strong>. Os 65% restantes são distribuídos entre os vencedores. Sem taxas ocultas.
                            </p>
                        </div>

                        <div className="bg-[#151921] border border-white/10 p-6 rounded-2xl hover:border-yellow-500/50 transition-colors">
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Cash Out (Saída)</div>
                            <div className="text-4xl font-black text-white mb-2">20%</div>
                            <p className="text-sm text-gray-400">
                                Multa sobre o valor apostado se você cancelar sua posição antes do evento encerrar.
                            </p>
                        </div>

                        <div className="bg-[#151921] border border-white/10 p-6 rounded-2xl hover:border-blue-500/50 transition-colors">
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Depósitos e Saques</div>
                            <div className="text-4xl font-black text-white mb-2">R$ 2,90</div>
                            <p className="text-sm text-gray-400">
                                Taxa fixa apenas para saques. Depósitos são sem custo via PIX instantâneo.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 4. Exemplo Prático com Matemática Correta */}
                <section className="space-y-8 pt-8 border-t border-white/5">
                    <h2 className="text-2xl font-bold">Cenário Prático: Mario vs Luigi</h2>
                    <p className="text-gray-400">
                        Uma previsão sobre quem vence a corrida. <strong>Mario é a zebra</strong> (10 apostadores) e <strong>Luigi é o favorito</strong> (30 apostadores). Cada um apostou R$ 100.
                    </p>

                    <div className="bg-[#151921] border border-white/10 rounded-2xl p-8 space-y-8 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                            {/* Mario */}
                            <div className="text-center group">
                                <div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center mx-auto text-3xl mb-3 shadow-[0_0_20px_rgba(59,130,246,0.3)]">👷</div>
                                <div className="font-bold text-blue-400 text-lg">Mario</div>
                                <div className="text-sm text-gray-400">10 pessoas</div>
                                <div className="text-xs text-blue-300 mt-1">Pool: R$ 1.000</div>
                            </div>

                            {/* Pool Total */}
                            <div className="flex flex-col items-center">
                                <div className="text-xl font-black text-white/20">VS</div>
                                <div className="h-px w-20 bg-white/10 my-4"></div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Pool Total</span>
                                    <span className="text-2xl font-black text-white">R$ 4.000</span>
                                </div>
                            </div>

                            {/* Luigi */}
                            <div className="text-center group">
                                <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto text-3xl mb-3 shadow-[0_0_20px_rgba(34,197,94,0.3)]">🍄</div>
                                <div className="font-bold text-green-400 text-lg">Luigi</div>
                                <div className="text-sm text-gray-400">30 pessoas</div>
                                <div className="text-xs text-green-300 mt-1">Pool: R$ 3.000</div>
                            </div>
                        </div>

                        {/* Calculation Box */}
                        <div className="bg-black/40 rounded-xl p-6 border border-white/5 space-y-6">

                            {/* Step 1: Commission */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-white flex items-center gap-2">
                                    <Percent className="w-5 h-5 text-yellow-400" />
                                    Passo 1 — Retirar a Comissão (35%)
                                </h4>
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div className="bg-white/5 rounded-lg p-3 text-center">
                                        <div className="text-gray-400">Pool Total</div>
                                        <div className="text-white font-black text-lg">R$ 4.000</div>
                                    </div>
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                                        <div className="text-yellow-400">Comissão (35%)</div>
                                        <div className="text-yellow-400 font-black text-lg">− R$ 1.400</div>
                                    </div>
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                                        <div className="text-emerald-400">Prêmio (65%)</div>
                                        <div className="text-emerald-400 font-black text-lg">R$ 2.600</div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Odds */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-400" />
                                    Passo 2 — Calcular as Odds
                                </h4>
                                <div className="grid md:grid-cols-2 gap-3 text-sm">
                                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg p-4">
                                        <div className="font-bold text-blue-400 mb-2">Mario (Zebra)</div>
                                        <div className="text-gray-400 font-mono">Odd = R$ 2.600 ÷ R$ 1.000</div>
                                        <div className="text-2xl font-black text-blue-300 mt-1">= 2,60x</div>
                                    </div>
                                    <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-4">
                                        <div className="font-bold text-green-400 mb-2">Luigi (Favorito)</div>
                                        <div className="text-gray-400 font-mono">Odd = R$ 2.600 ÷ R$ 3.000</div>
                                        <div className="text-2xl font-black text-green-300 mt-1">= 0,87x → 1,01x</div>
                                        <div className="text-xs text-gray-500 mt-1">*Odd mínima garantida: 1,01x</div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Payouts */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-white flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-green-500" />
                                    Passo 3 — Resultado Final (apostou R$ 100)
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-white/5">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">Cenário</th>
                                                <th className="px-4 py-3">Aposta</th>
                                                <th className="px-4 py-3">Odd</th>
                                                <th className="px-4 py-3">Cálculo</th>
                                                <th className="px-4 py-3 rounded-r-lg text-right">Recebe</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr className="bg-blue-500/5">
                                                <td className="px-4 py-4 font-bold text-blue-400">Mario Venceu (Zebra)</td>
                                                <td className="px-4 py-4 text-white">R$ 100</td>
                                                <td className="px-4 py-4 text-white font-mono">2,60x</td>
                                                <td className="px-4 py-4 text-gray-400">100 × 2,60</td>
                                                <td className="px-4 py-4 text-right font-bold text-green-400">R$ 260,00</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-4 font-bold text-green-400">Luigi Venceu (Favorito)</td>
                                                <td className="px-4 py-4 text-white">R$ 100</td>
                                                <td className="px-4 py-4 text-white font-mono">1,01x</td>
                                                <td className="px-4 py-4 text-gray-400">100 × 1,01 (mínimo)</td>
                                                <td className="px-4 py-4 text-right font-bold text-green-400">R$ 101,00</td>
                                            </tr>
                                            <tr className="bg-red-500/5">
                                                <td className="px-4 py-4 font-bold text-red-500">Você Perdeu</td>
                                                <td className="px-4 py-4 text-white">R$ 100</td>
                                                <td className="px-4 py-4 text-white font-mono">—</td>
                                                <td className="px-4 py-4 text-gray-400">Aposta no lado errado</td>
                                                <td className="px-4 py-4 text-right font-bold text-red-500">R$ 0,00</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg text-sm text-blue-200 flex gap-3 items-start mt-2">
                                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Garantia da plataforma:</strong> Nunca pagamos mais do que o pool acumulado. Os 65% são distribuídos proporcionalmente — quanto mais pessoas escolheram seu lado, menor a odd. Quanto menos pessoas, maior o prêmio.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer CTA */}
                <div className="pt-12 text-center">
                    <Link href="/app/markets" className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-10 py-5 rounded-xl font-bold text-lg transition-all shadow-[0_10px_40px_rgba(47,124,70,0.3)] hover:-translate-y-1">
                        Entendi a Lógica! Começar Agora <ArrowRight className="w-6 h-6" />
                    </Link>
                </div>

            </div>
        </div>
    );
}
