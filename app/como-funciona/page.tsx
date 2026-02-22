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
                        <h2 className="text-3xl font-bold">1. Você joga contra outros usuários</h2>
                    </div>
                    <p className="text-gray-300 text-lg leading-relaxed">
                        No Predity você não joga contra a casa. Todo valor apostado vai para um <strong className="text-white">pool coletivo</strong>.
                        Quem acerta divide proporcionalmente o que foi apostado por quem errou.
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
                        Nossa comissão é cobrada <strong className="text-white">apenas sobre o lucro</strong> — não sobre o valor total apostado.
                        Isso significa que mesmo no pior cenário (um lado concentrando quase todo o pool), o apostador
                        sempre recebe pelo menos o valor que apostou de volta.
                    </p>

                    {/* Formula box */}
                    <div className="bg-[#0d1420] border border-primary/20 rounded-2xl p-6 space-y-4 shadow-[0_0_40px_rgba(4,179,5,0.05)]">
                        <p className="text-xs font-bold text-primary uppercase tracking-widest">Fórmula</p>
                        <div className="font-mono text-lg text-center space-y-3">
                            <div className="text-gray-400">Raw Odd = Pool Total ÷ Pool do Seu Lado</div>
                            <div className="text-gray-600">↓</div>
                            <div className="text-yellow-400 font-black text-xl">Odd Final = 1 + (Raw Odd − 1) × 0,65</div>
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
                                    <div className="text-gray-500">Raw = 4000 ÷ 3000 = <span className="text-white">1,33</span></div>
                                    <div className="text-gray-500">Lucro bruto = 1,33 − 1 = <span className="text-white">0,33</span></div>
                                    <div className="text-gray-500">Líquido = 0,33 × 0,65 = <span className="text-white">0,22</span></div>
                                    <div className="text-primary font-black text-sm mt-1">Odd Final = 1,22×</div>
                                </div>
                            </div>
                            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2">
                                <div className="font-bold text-primary text-base">🎮 Luigi (Azarão)</div>
                                <div className="text-gray-400">Pool do lado: <strong className="text-white">R$ 1.000</strong></div>
                                <div className="text-gray-400">Pool total: <strong className="text-white">R$ 4.000</strong></div>
                                <div className="border-t border-white/10 pt-2 font-mono space-y-1 text-xs">
                                    <div className="text-gray-500">Raw = 4000 ÷ 1000 = <span className="text-white">4,00</span></div>
                                    <div className="text-gray-500">Lucro bruto = 4 − 1 = <span className="text-white">3,00</span></div>
                                    <div className="text-gray-500">Líquido = 3,00 × 0,65 = <span className="text-white">1,95</span></div>
                                    <div className="text-primary font-black text-sm mt-1">Odd Final = 2,95×</div>
                                </div>
                            </div>
                        </div>

                        {/* Result table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-gray-400 border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-left">
                                        <th className="pb-3 text-gray-500 font-bold">Cenário</th>
                                        <th className="pb-3 text-gray-500 font-bold">Aposta</th>
                                        <th className="pb-3 text-gray-500 font-bold">Odd</th>
                                        <th className="pb-3 text-gray-500 font-bold text-right">Recebe</th>
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

                {/* 4. Garantias */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-bold">4. Suas Garantias</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            { icon: '🛡️', title: 'Odd mínima 1,00×', desc: 'Você nunca recebe menos do que apostou. Mesmo se toda a plataforma apostar no mesmo lado.' },
                            { icon: '📊', title: 'Odds em tempo real', desc: 'A cada novo apostador, as odds se ajustam automaticamente refletindo a probabilidade real.' },
                            { icon: '⚡', title: 'Sem risco para a casa', desc: 'A comissão é sempre garantida. Sem VOID, sem perdas, sem jogos manipulados.' },
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
                        Muitos novos jogadores nos perguntam: <em className="text-gray-400">"Se o mercado acabou de abrir e não tem ninguém apostando, a chance não é de 50% para cada lado? Por que a cotação não é 2.00x?"</em>
                    </p>

                    <p className="text-gray-300 text-lg leading-relaxed">
                        A resposta é simples: <strong className="text-white">A Taxa de Segurança da Plataforma (O Juice) 🧃</strong>.
                    </p>

                    <div className="bg-surface border border-white/5 rounded-2xl p-6 space-y-4">
                        <ul className="space-y-4 text-gray-300">
                            <li className="flex items-start gap-3">
                                <span className="text-xl">⚖️</span>
                                <div>
                                    <strong className="text-white">O Ponto de Equilíbrio:</strong> Quando um mercado nasce, o sistema de fato assume o risco como 50/50 (uma moeda lançada). O multiplicador puro de 50% matematicamente é 2.00x.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-xl">🛡️</span>
                                <div>
                                    <strong className="text-white">A Proteção do Ecossistema:</strong> Para que a plataforma possa existir e ser sustentável sem risco de quebrar, nós aplicamos a margem de segurança nas cotações iniciais.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-xl">〽️</span>
                                <div>
                                    <strong className="text-white">O Ajuste Realista:</strong> Nós "retraímos" aquele 2.00x irreal do vácuo para cerca de <strong className="text-primary">1.65x</strong>. Assim, o primeiro corajoso que apostar estará ajudando a pavimentar a primeira camada de dinheiro (Pool).
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-xl">🌊</span>
                                <div>
                                    <strong className="text-white">Sabedoria das Massas:</strong> A magia acontece minutos depois da criação! À medida que dezenas de pessoas começam a colocar dinheiro de um lado e do outro, a matemática inicial do "1.65x" é engolida pelo volume de dinheiro real dos apostadores. O mercado encontra seu <strong className="text-white" style={{ textDecoration: 'underline', textUnderlineOffset: '4px' }}>preço e odd justos</strong> sozinho.
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
                                    <td className="px-6 py-4 text-white font-bold">Comissão por aposta</td>
                                    <td className="px-6 py-4 text-yellow-400 font-bold">35% sobre o lucro</td>
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
                        <strong className="text-white">Garantia da plataforma:</strong> As odds são calculadas e exibidas em tempo real.
                        A comissão é aplicada somente sobre o lucro — quanto mais você ganha, mais pagamos juntos.
                        Quem aposta no lado errado banca os vencedores. A casa sempre mantém seus 35% sobre o lucro gerado.
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center py-8">
                    <Link href="/app/markets" className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-10 py-5 rounded-xl font-bold text-lg transition-all shadow-[0_10px_40px_rgba(4,179,5,0.3)] hover:-translate-y-1">
                        Entendi! Quero Apostar Agora <ArrowRight className="w-6 h-6" />
                    </Link>
                </div>

            </div>
        </div>
    );
}
