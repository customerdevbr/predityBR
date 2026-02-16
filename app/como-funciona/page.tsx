import Link from 'next/link';
import { ArrowRight, CheckCircle, Coins, Percent, TrendingUp, Users, ShieldCheck, Banknote } from 'lucide-react';

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-[#0d1117] text-white">
            {/* Header / Hero */}
            <div className="bg-surface border-b border-white/5 py-20"> {/* Increased padding */}
                <div className="container mx-auto px-4 text-center max-w-3xl">
                    <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                        Como funciona o Predity?
                    </h1>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        Entenda nossa lógica de <strong>Odds Dinâmicas</strong>, taxas transparentes e porque somos a plataforma mais segura para suas previsões.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16 max-w-4xl space-y-20">

                {/* 1. O Conceito (Pool) */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                            <Users className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">1. Previsões Coletivas (O Pool)</h2>
                    </div>

                    <div className="prose prose-invert max-w-none text-gray-300 text-lg leading-relaxed">
                        <p>
                            No <strong>Predity</strong>, você não joga contra a casa. Você joga <strong className="text-white">contra outros usuários</strong>.
                            Todo o valor aportado vai para um cofre comum (Pool). Quem acerta o resultado, divide o montante de quem errou.
                        </p>
                    </div>
                </section>

                {/* 2. Odds Dinâmicas */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <TrendingUp className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">2. A Matemática das Odds</h2>
                    </div>

                    <div className="prose prose-invert max-w-none text-gray-300 text-lg leading-relaxed space-y-4">
                        <p>
                            Nossas odds não são fixas. Elas flutuam baseadas na opinião do público. A fórmula é simples e transparente:
                        </p>

                        <div className="bg-[#151921] border border-white/10 p-6 rounded-xl font-mono text-center text-xl text-yellow-400 my-6 shadow-inner">
                            Odd = (Pool Total) / (Pool do Seu Lado)
                        </div>

                        <p>
                            <strong>Por que isso é bom?</strong>
                        </p>
                        <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                            <li>Se todo mundo acha que o Brasil vai ganhar, a Odd do Brasil cai (pagamento menor, pois é "fácil").</li>
                            <li>Se você entra na zebra e acerta, você ganha uma fatia gigante do bolo, pois poucos dividiram o prêmio com você.</li>
                        </ul>
                    </div>
                </section>

                {/* 3. Taxas e Segurança */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">3. Taxas e Segurança</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Taxa de Serviço */}
                        <div className="bg-[#151921] border border-white/10 p-6 rounded-2xl hover:border-primary/50 transition-colors">
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Taxa de Serviço</div>
                            <div className="text-4xl font-black text-white mb-2">35%</div>
                            <p className="text-sm text-gray-400">
                                Cobrada sobre o <strong>pool total arrecadado</strong>. Essencial para manutenção da plataforma e marketing.
                            </p>
                        </div>

                        {/* Cash Out */}
                        <div className="bg-[#151921] border border-white/10 p-6 rounded-2xl hover:border-yellow-500/50 transition-colors">
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Cash Out (Saída)</div>
                            <div className="text-4xl font-black text-white mb-2">20%</div>
                            <p className="text-sm text-gray-400">
                                Multa sobre o valor da entrada caso você decida cancelar sua posição antes do evento encerrar.
                            </p>
                        </div>

                        {/* Pagamentos */}
                        <div className="bg-[#151921] border border-white/10 p-6 rounded-2xl hover:border-blue-500/50 transition-colors">
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Depósitos e Saques</div>
                            <div className="text-4xl font-black text-white mb-2">3%</div>
                            <p className="text-sm text-gray-400">
                                Custo de processamento seguro via PIX e Gateways de Pagamento para garantir a segurança do seu saldo.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 4. Exemplo Real */}
                <section className="space-y-8 pt-8 border-t border-white/5">
                    <h2 className="text-2xl font-bold">Cenário Prático: Mario vs Luigi</h2>
                    <p className="text-gray-400">
                        Imagine uma previsão sobre quem vence a corrida. Vamos supor que <strong>Mario é a zebra</strong> (pouca gente acredita) e <strong>Luigi o favorito</strong>.
                        Cada pessoa aporta R$ 100.
                    </p>

                    <div className="bg-[#151921] border border-white/10 rounded-2xl p-8 space-y-8 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                            {/* Mario */}
                            <div className="text-center group">
                                <div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center mx-auto text-3xl mb-3 shadow-[0_0_20px_rgba(59,130,246,0.3)]">👷</div>
                                <div className="font-bold text-blue-400 text-lg">Mario</div>
                                <div className="text-sm text-gray-400">1.000 pessoas</div>
                                <div className="text-xs text-blue-300 mt-1">Pool: R$ 100.000</div>
                            </div>

                            {/* VS */}
                            <div className="flex flex-col items-center">
                                <div className="text-xl font-black text-white/20">VS</div>
                                <div className="h-px w-20 bg-white/10 my-4"></div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Pool Total (Bruto)</span>
                                    <span className="text-2xl font-black text-white">R$ 400.000</span>
                                </div>
                            </div>

                            {/* Luigi */}
                            <div className="text-center group">
                                <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto text-3xl mb-3 shadow-[0_0_20px_rgba(34,197,94,0.3)]">🍄</div>
                                <div className="font-bold text-green-400 text-lg">Luigi</div>
                                <div className="text-sm text-gray-400">3.000 pessoas</div>
                                <div className="text-xs text-green-300 mt-1">Pool: R$ 300.000</div>
                            </div>
                        </div>

                        {/* Calculation Box */}
                        <div className="bg-black/40 rounded-xl p-6 border border-white/5 space-y-4">
                            <h4 className="font-bold text-white flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-blue-500" />
                                Resultado: Mario Venceu! (A Zebra Pagou Bem)
                            </h4>
                            <p className="text-sm text-gray-400">
                                Como pouca gente escolheu o Mario, o prêmio (que veio do dinheiro de quem escolheu o Luigi) é dividido entre poucas pessoas.
                            </p>

                            <div className="space-y-3 text-sm font-mono bg-black/30 p-4 rounded border border-white/5">
                                <div className="flex justify-between text-gray-400">
                                    <span>Pool Total</span>
                                    <span>R$ 400.000,00</span>
                                </div>
                                <div className="flex justify-between text-red-500">
                                    <span>Taxa da Casa (35%)</span>
                                    <span>- R$ 140.000,00</span>
                                </div>
                                <div className="h-px bg-white/10 my-1"></div>
                                <div className="flex justify-between text-lg font-bold text-white">
                                    <span>Prêmio Líquido a Distribuir</span>
                                    <span>R$ 260.000,00</span>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg text-center">
                                    <div className="text-xs text-blue-300 uppercase font-bold mb-1">Se você colocou R$ 100 no Mario</div>
                                    <div className="text-2xl font-black text-white">Recebe R$ 260,00</div>
                                    <div className="text-xs text-gray-400 mt-1">Lucro de R$ 160 (2.6x)</div>
                                </div>
                                <div className="bg-green-500/5 border border-white/5 p-4 rounded-lg text-center opacity-50">
                                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Se Luigi tivesse vencido</div>
                                    <div className="text-xl font-bold text-gray-400">Receberia R$ 86,66</div>
                                    <div className="text-xs text-gray-500 mt-1">Prejuízo (0.86x) pois era muito favorito</div>
                                </div>
                            </div>
                            <p className="text-xs text-center text-gray-500 mt-2">
                                *Nota: Entrar no favorito absoluto pode render menos que o valor aportado após as taxas, fique atento às Odds!
                            </p>
                        </div>
                    </div>
                </section>

                {/* Footer CTA */}
                <div className="pt-12 text-center">
                    <Link href="/app/markets" className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-10 py-5 rounded-xl font-bold text-lg transition-all shadow-[0_10px_40px_rgba(34,197,94,0.3)] hover:-translate-y-1">
                        Entendi a Lógica! Começar Agora <ArrowRight className="w-6 h-6" />
                    </Link>
                </div>

            </div>
        </div>
    );
}
