import { Scale } from 'lucide-react';

export default function LegalPage() {
    return (
        <div className="min-h-screen py-24 px-4 bg-[#0f1115]">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center gap-4 border-b border-white/10 pb-8">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <Scale className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Segurança Jurídica</h1>
                        <p className="text-gray-400 mt-1">Termos e condições do serviço PredityBR</p>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
                    <p>
                        Bem-vindo à PredityBR. Ao utilizar nossa plataforma de mercados de previsão, você concorda legalmente com os termos descritos nesta página, que regem as regras de operação, resolução de mercados e direitos e deveres dos usuários.
                    </p>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Natureza do Serviço</h2>
                    <p>
                        A PredityBR oferece um ambiente digital de "Prediction Markets" (Mercados de Previsão). Neste ambiente, os usuários podem realizar previsões sobre eventos futuros e mensuráveis. O sistema opera baseado na dinâmica de probabilidade formada pelo próprio pool de participantes, sendo a PredityBR a fornecedora e intermediadora da infraestrutura tecnológica.
                    </p>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Elegibilidade</h2>
                    <p>
                        O uso da plataforma é estritamente proibido para menores de 18 (dezoito) anos ou indivíduos que não possuam plena capacidade civil civil. O usuário atesta, no momento do registro, o cumprimento deste requisito legal.
                    </p>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Resolução de Mercados e Pagamentos</h2>
                    <p>A liquidação ("resolução") de um mercado é realizada baseada nos seguintes preceitos legais e técnicos:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Fonte de Verdade:</strong> Os resultados são confirmados com base em informações públicas, oficiais e amplamente verificáveis da fonte indicada na descrição de cada mercado.</li>
                        <li><strong>Taxas de Serviço:</strong> A plataforma detém o direito de aplicar margens ou taxas administrativas (comissões operacionais) sobre os prêmios ou processos de entrada/saída (cash out), conforme as Regras e Taxas dispostas no site. O cálculo das odds já reflete as comissões onde aplicável.</li>
                        <li><strong>Invalidação:</strong> Em caso de suspensão do evento subjacente, comprovação cabal de fraude ou impossibilidade técnica de validação do resultado final, o mercado será invalidado e o valor estornado às carteiras virtuais locais dos participantes.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Limitação de Responsabilidade</h2>
                    <p>
                        A PredityBR não se responsabiliza por perdas financeiras advindas das decisões de previsão do usuário, interrupções sistêmicas provocadas por força maior (como quedas de infraestrutura de conectividade de terceiros) ou eventuais atrasos no processamento bancário do sistema PIX (embora envidemos esforços para garantia de automação).
                    </p>
                </div>
            </div>
        </div>
    );
}
