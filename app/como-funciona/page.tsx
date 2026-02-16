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
                            <div className="text-4xl font-black text-white mb-2">R$ 2,90</div>
                            <p className="text-sm text-gray-400">
                                Taxa fixa apenas para saques. Depósitos são gratuitos via PIX.
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
                                <div className="text-sm text-gray-400">10 pessoas</div>
                                <div className="text-xs text-blue-300 mt-1">Pool: R$ 1.000</div>
                            </div>

                            {/* VS */}
                            <div className="flex flex-col items-center">
                                <div className="text-xl font-black text-white/20">VS</div>
                                <div className="h-px w-20 bg-white/10 my-4"></div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Pool Total (Bruto)</span>
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

                        {/* Calculation Box - REMOVED per request to avoid misleading profit expectations */}
                        <div className="bg-black/40 rounded-xl p-6 border border-white/5 space-y-4">
                            <h4 className="font-bold text-white flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-blue-500" />
                                Como funciona a divisão?
                            </h4>
                            <p className="text-sm text-gray-400">
                                Como menos pessoas escolheram o Mario, o prêmio (que veio do montante de quem escolheu o Luigi) é dividido entre poucos participantes.
                            </p>

                            {/* Detailed Math Explanation */}
                            <div className="bg-black/40 rounded-xl p-6 border border-white/5 space-y-6">
                                <h4 className="font-bold text-white flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-green-500" />
                                    Entendendo seus Ganhos (Matemática)
                                </h4>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-white/5">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">Cenário</th>
                                                <th className="px-4 py-3">Sua Aposta</th>
                                                <th className="px-4 py-3">Odd Final</th>
                                                <th className="px-4 py-3">Cálculo</th>
                                                <th className="px-4 py-3 rounded-r-lg text-right">Resultado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {/* Scenario 1: Mario Wins */}
                                            <tr className="bg-blue-500/5">
                                                <td className="px-4 py-4 font-bold text-blue-400">Mario Venceu (Zebra)</td>
                                                <td className="px-4 py-4 text-white">R$ 100</td>
                                                <td className="px-4 py-4 text-white font-mono">4.00x</td>
                                                <td className="px-4 py-4 text-gray-400">
                                                    <div className="flex flex-col gap-1">
                                                        <span>Odd = 4000 (Total) / 1000 (Mario)</span>
                                                        <span>Retorno = 100 * 4.00</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-green-400">+ R$ 400,00</td>
                                            </tr>

                                            {/* Scenario 2: Luigi Wins */}
                                            <tr>
                                                <td className="px-4 py-4 font-bold text-green-400">Luigi Venceu (Favorito)</td>
                                                <td className="px-4 py-4 text-white">R$ 100</td>
                                                <td className="px-4 py-4 text-white font-mono">1.33x</td>
                                                <td className="px-4 py-4 text-gray-400">
                                                    <div className="flex flex-col gap-1">
                                                        <span>Odd = 4000 (Total) / 3000 (Luigi)</span>
                                                        <span>Retorno = 100 * 1.33</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-green-400">+ R$ 133,00</td>
                                            </tr>

                                            {/* Scenario 3: Lost */}
                                            <tr className="bg-red-500/5">
                                                <td className="px-4 py-4 font-bold text-red-500">Você Perdeu</td>
                                                <td className="px-4 py-4 text-white">R$ 100</td>
                                                <td className="px-4 py-4 text-white font-mono">-</td>
                                                <td className="px-4 py-4 text-gray-400">
                                                    <span>Você apostou no lado errado.</span>
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-red-500">R$ 0,00</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg text-sm text-yellow-200 flex gap-3 items-start">
                                    <Percent className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Nota sobre o Risco:</strong> Apostar na Zebra (Mario) paga muito mais (4x) porque é mais arriscado. Apostar no Favorito (Luigi) é "mais seguro", mas o lucro é pequeno (1.33x) porque o prêmio é dividido por muita gente.
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-center text-gray-500 mt-2">
                                *Nota: Prever o favorito absoluto (muita gente escolhendo) rende menos, pois o prêmio é dividido por mais pessoas.
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
