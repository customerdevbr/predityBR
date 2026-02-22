import { DollarSign, ArrowDownLeft, ArrowUpRight, ShieldAlert } from 'lucide-react';

export default function FeesPage() {
    return (
        <div className="min-h-screen py-24 px-4 bg-[#0f1115]">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header Card (Profile Style) */}
                <div
                    className="rounded-2xl border border-white/5 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #10161e 0%, #0f1115 60%, #0a110a 100%)' }}
                >
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #04B305, #6eff6e, #04B305)' }} />
                    <div className="p-6 md:p-8">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30 shadow-[0_0_20px_rgba(47,124,70,0.2)]">
                                <DollarSign className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white">Taxas e Limites</h1>
                                <p className="text-sm text-gray-400 mt-1">Transparência em todas as suas movimentações na PredityBR.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Operations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Deposits */}
                    <div className="bg-[#0d121a] border border-white/5 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Depósitos (PIX)</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-sm text-gray-500">Taxa de Operação</span>
                                <span className="text-sm font-bold text-emerald-400">ISENTO</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-sm text-gray-500">Valor Mínimo</span>
                                <span className="text-sm font-bold text-white">R$ 10,00</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Prazo de Confirmação</span>
                                <span className="text-sm font-bold text-white">Instantâneo</span>
                            </div>
                        </div>
                    </div>

                    {/* Withdrawals */}
                    <div className="bg-[#0d121a] border border-white/5 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                <ArrowUpRight className="w-5 h-5 text-red-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Saques (PIX)</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-sm text-gray-500">Taxa de Operação</span>
                                <span className="text-sm font-bold text-emerald-400">ISENTO</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-sm text-gray-500">Valor Mínimo</span>
                                <span className="text-sm font-bold text-white">R$ 50,00</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Prazo de Confirmação</span>
                                <span className="text-sm font-bold text-white">Imediato / Até 2h</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Margins */}
                <div className="bg-[#0d121a] border border-white/5 rounded-xl overflow-hidden p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-white text-lg">Comissões da Plataforma</h3>
                            <div className="space-y-3 mt-4">
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    A PredityBR atua como provedora de infraestrutura para que você acesse as cotações feitas diretamente entre os usuários. Não cobramos taxas mensais, nem de saques e depósitos.
                                </p>
                                <p className="text-sm text-gray-400 leading-relaxed border-l-2 border-primary pl-4 py-1">
                                    Nós pegamos uma taxa administrativa padrão de <strong>35% aplicada *apenas* sobre o volume final do prêmio</strong> antes da conversão nas Odds dinâmicas no painel. O valor da ODD exibido na tela no momento de sua entrada já inclui esse cálculo e é o retorno real que você receberá ao fechar com mercado garantido.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
