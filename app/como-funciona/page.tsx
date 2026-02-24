// Global Replace of "Aposta" terms within the content
import Link from 'next/link';
import { ArrowRight, TrendingUp, Users, Calculator, Zap, ShieldCheck, Banknote, Info } from 'lucide-react';

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-[#0d1117] text-white">

            {/* Hero */}
            <div className="bg-surface border-b border-white/5 py-20">
                <div className="container mx-auto px-4 text-center max-w-3xl">
                    <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                        Como Funciona o Predity?
                    </h1>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        Pool coletivo, odds dinâmicas e comissão <strong className="text-white">somente sobre o lucro</strong>.
                        Totalmente transparente.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16 max-w-4xl space-y-20">

                {/* 1. Pool Coletivo */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(4,179,5,0.2)]">
                            <Users className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">1. Você prevê contra outros usuários</h2>
                    </div>
                    <p className="text-gray-300 text-lg leading-relaxed">
                        No Predity você não joga contra a casa. Todo valor alocado em previsões vai para um <strong className="text-white">pool coletivo</strong>.
                        Quem acerta divide proporcionalmente o que foi alocado por quem errou.
                        A plataforma não corre risco: a comissão é sempre garantida antes da distribuição.
                    </p>
                </section>

                {/* 2. A nova fórmula */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <Calculator className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">2. Comissão sobre o Lucro (35%)</h2>
                    </div>

                    <p className="text-gray-300 text-lg leading-relaxed">
                        Nossa comissão é cobrada <strong className="text-white">apenas sobre o lucro</strong> — não sobre o valor total alocado na sua previsão.
                        Isso significa que mesmo no pior cenário (um lado concentrando quase todo o pool), o participante
                        sempre recebe pelo menos o valor da sua previsão de volta.
                    </p>

                    {/* Formula box */}
                    <div className="bg-[#0d1420] border border-primary/20 rounded-2xl p-6 space-y-4 shadow-[0_0_40px_rgba(4,179,5,0.05)]">
                        <p className="text-xs font-bold text-primary uppercase tracking-widest">Fórmula de Estimativa</p>
                        <div className="font-mono text-lg text-center space-y-3">
                            <div className="text-gray-400">Odd Bruta = Pool Total ÷ Pool da Opção</div>
                            <div className="text-gray-600">↓</div>
                            <div className="text-yellow-400 font-black text-xl">Odd Estimada = 1 + (Odd Bruta − 1) × 0,65</div>
                        </div>
                        <div className="text-center text-xs text-gray-500 mt-2">
                            Os 35% são aplicados apenas no lucro — nunca abaixo de <strong className="text-white">1,00×</strong>
                        </div>
                    </div>

                    {/* Example */}
                    <div className="bg-surface border border-white/5 rounded-2xl p-6 space-y-6">
                        <p className="font-bold text-white text-lg">Exemplo Prático: Mario vs. Luigi</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
                                <div className="font-bold text-red-400 text-base">🍄 Mario (Favorito)</div>
                                <div className="text-gray-400">Pool do lado: <strong className="text-white">R$ 3.000</strong></div>
                                <div className="text-gray-400">Pool total: <strong className="text-white">R$ 4.000</strong></div>
                                <div className="border-t border-white/10 pt-2 font-mono space-y-1 text-xs">
                                    <div className="text-gray-500">Bruta = 4000 ÷ 3000 = <span className="text-white">1,33</span></div>
                                    <div className="text-gray-500">Lucro bruto = 1,33 − 1 = <span className="text-white">0,33</span></div>
                                    <div className="text-gray-500">Líquido = 0,33 × 0,65 = <span className="text-white">0,22</span></div>
                                    <div className="text-primary font-black text-sm mt-1">Estimativa = 1,22×</div>
                                </div>
                            </div>
                            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2">
                                <div className="font-bold text-primary text-base">🎮 Luigi (Azarão)</div>
                                <div className="text-gray-400">Pool do lado: <strong className="text-white">R$ 1.000</strong></div>
                                <div className="text-gray-400">Pool total: <strong className="text-white">R$ 4.000</strong></div>
                                <div className="border-t border-white/10 pt-2 font-mono space-y-1 text-xs">
                                    <div className="text-gray-500">Bruta = 4000 ÷ 1000 = <span className="text-white">4,00</span></div>
                                    <div className="text-gray-500">Lucro bruto = 4 − 1 = <span className="text-white">3,00</span></div>
                                    <div className="text-gray-500">Líquido = 3,00 × 0,65 = <span className="text-white">1,95</span></div>
                                    <div className="text-primary font-black text-sm mt-1">Estimativa = 2,95×</div>
                                </div>
                            </div>
                        </div>

                        {/* Result table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-gray-400 border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-left">
                                        <th className="pb-3 text-gray-500 font-bold">Cenário</th>
                                        <th className="pb-3 text-gray-500 font-bold">Previsão</th>
                                        <th className="pb-3 text-gray-500 font-bold">Odd</th>
                                        <th className="pb-3 text-gray-500 font-bold text-right">Líquido (Retorno Estimado)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-white/5">
                                        <td className="py-3 text-gray-300">Mario vence (favorito)</td>
                                        <td className="py-3">R$ 100</td>
                                        <td className="py-3">1,22×</td>
                                        <td className="py-3 text-right font-bold text-primary">R$ 122,00</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-3 text-gray-300">Luigi vence (azarão)</td>
                                        <td className="py-3">R$ 100</td>
                                        <td className="py-3">2,95×</td>
                                        <td className="py-3 text-right font-bold text-primary">R$ 295,00</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* 3. Garantias */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">3. Suas Garantias</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            { icon: '🛡️', title: 'Retorno mínimo 1,00×', desc: 'Você nunca recebe menos do que alocou. Mesmo se toda a plataforma prever no mesmo lado.' },
                            { icon: '📊', title: 'Odds Dinâmicas (Estimadas)', desc: 'A cada novo participante com Suas Shares, a estimativa do prêmio reflete a probabilidade matemática total do mercado até o fechamento.' },
                            { icon: '⚡', title: 'Sem risco para a casa', desc: 'A comissão é sempre garantida sem conflito de interesses. Não manipulamos resultados num modelo Pari-Mutuel Puro.' },
                        ].map(item => (
                            <div key={item.title} className="bg-surface border border-white/5 rounded-xl p-5 space-y-2">
                                <div className="text-2xl">{item.icon}</div>
                                <div className="font-bold text-white">{item.title}</div>
                                <div className="text-sm text-gray-400">{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. Por que os mercados começam em 1.65x? */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                            <TrendingUp className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">4. Por que novos mercados começam em 1.65x?</h2>
                    </div>

                    <p className="text-gray-300 text-lg leading-relaxed">
                        Muitos novos participantes nos perguntam: <em className="text-gray-400">"Se o mercado acabou de abrir e não tem ninguém prevendo, a chance não é de 50% para cada lado? Por que a cotação não é 2.00x?"</em>
                    </p>

                    <p className="text-gray-300 text-lg leading-relaxed">
                        A resposta é simples: <strong className="text-white">A Taxa de Segurança da Plataforma (O Juice) 🧃</strong>.
                    </p>

                    <div className="bg-surface border border-white/5 rounded-2xl p-6 space-y-4">
                        <ul className="space-y-4 text-gray-300">
                            <li className="flex items-start gap-3">
                                <span className="text-xl">⚖️</span>
                                <div>
                                    <strong className="text-white">O Ponto de Equilíbrio:</strong> Quando um mercado nasce, o sistema inicialmente divide o peso. O multiplicador puro de 50% matematicamente é 2.00x.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-xl">🛡️</span>
                                <div>
                                    <strong className="text-white">A Proteção do Ecossistema:</strong> Para que a plataforma funcione repassando o pool de forma Pari-Mutuel, a margem retida existe sobre o lucro esperado.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-xl">〽️</span>
                                <div>
                                    <strong className="text-white">O Ajuste Realista:</strong> Nós "retraímos" aquele 2.00x irreal para a estimativa de cerca de <strong className="text-primary">1.65x</strong>. Assim, os primeiros participantes ajudam a pavimentar o crescimento das suas 'Shares' (Participações) ativas.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-xl">🌊</span>
                                <div>
                                    <strong className="text-white">Sabedoria das Massas:</strong> A magia acontece minutos depois da criação! À medida que dezenas de pessoas começam a prever de um lado e do outro, a matemática do "1.65x" se ajusta às opiniões (Dinheiro Ativo). O mercado encontra seu <strong className="text-white" style={{ textDecoration: 'underline', textUnderlineOffset: '4px' }}>valor orgânico</strong> baseado na liquidez.
                                </div>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* 5. Taxas operacionais */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                            <Banknote className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">5. Taxas Operacionais</h2>
                    </div>

                    <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 bg-black/20">
                                    <th className="text-left px-6 py-4 text-gray-400 font-bold">Operação</th>
                                    <th className="text-left px-6 py-4 text-gray-400 font-bold">Taxa</th>
                                    <th className="text-left px-6 py-4 text-gray-400 font-bold">Mínimo</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-white/5">
                                    <td className="px-6 py-4 text-white font-bold">Comissão por previsão</td>
                                    <td className="px-6 py-4 text-yellow-400 font-bold">35% sobre o lucro do Pool</td>
                                    <td className="px-6 py-4 text-gray-500">—</td>
                                </tr>
                                <tr className="border-b border-white/5">
                                    <td className="px-6 py-4 text-white font-bold">Depósito PIX</td>
                                    <td className="px-6 py-4 text-primary font-bold">Grátis</td>
                                    <td className="px-6 py-4 text-gray-400">R$ 10,00</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 text-white font-bold">Saque PIX</td>
                                    <td className="px-6 py-4 text-orange-400 font-bold">R$ 2,90 (fixo)</td>
                                    <td className="px-6 py-4 text-gray-400">R$ 20,00</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Info box */}
                <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl flex gap-4 items-start">
                    <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-300 leading-relaxed">
                        <strong className="text-white">Garantia da plataforma:</strong> As Odds Dinâmicas são estimativas do pool atual. O seu pagamento baseia-se nas suas Shares % relativas de ganhadores. A comissão incide somente sobre o lucro — o lado perdedor banca a maioria através do pool coletivo.
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center py-8">
                    <Link href="/app/markets" className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-10 py-5 rounded-xl font-bold text-lg transition-all shadow-[0_10px_40px_rgba(4,179,5,0.3)] hover:-translate-y-1">
                        Entendi! Quero Lançar Previsão <ArrowRight className="w-6 h-6" />
                    </Link>
                </div>

            </div>
        </div>
    );
}
