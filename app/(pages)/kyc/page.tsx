import { ShieldCheck } from 'lucide-react';

export default function KycPage() {
    return (
        <div className="min-h-screen py-24 px-4 bg-[#0f1115]">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center gap-4 border-b border-white/10 pb-8">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Política de KYC e AML</h1>
                        <p className="text-gray-400 mt-1">Conheça o Seu Cliente e Prevenção à Lavagem de Dinheiro</p>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
                    <p>
                        A PredityBR está comprometida em manter os mais altos padrões de conformidade global e prevenção de atividades ilícitas. Nossa Política de KYC (Know Your Customer - Conheça o Seu Cliente) e AML (Anti-Money Laundering - Prevenção à Lavagem de Dinheiro) estabelece as diretrizes para garantir um ambiente seguro e transparente para todos os nossos usuários.
                    </p>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Identificação do Usuário (KYC)</h2>
                    <p>
                        Para utilizar nossos serviços, especialmente transações financeiras via PIX, exigimos que todos os usuários forneçam informações de identificação precisas e atualizadas. Isso inclui, mas não se limita a:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Nome completo.</li>
                        <li>Cadastro de Pessoa Física (CPF) válido.</li>
                        <li>Data de nascimento (obrigatório ser maior de 18 anos).</li>
                        <li>Endereço de e-mail válido para comunicação.</li>
                    </ul>
                    <p>
                        <strong>Importante:</strong> As contas bancárias utilizadas para depósitos e saques (via PIX) devem obrigatoriamente pertencer ao mesmo titular e CPF cadastrado na plataforma.
                    </p>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Monitoramento de Transações</h2>
                    <p>
                        Empregamos sistemas avançados para monitorar continuamente as transações realizadas na plataforma em busca de atividades suspeitas, incomuns ou que divirjam do perfil do usuário.
                    </p>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Prevenção à Lavagem de Dinheiro (AML)</h2>
                    <p>
                        A PredityBR não tolera qualquer forma de lavagem de dinheiro ou financiamento do terrorismo. Implementamos medidas rigorosas, alinhadas às melhores práticas internacionais e regulamentações locais, para prevenir, detectar e reportar qualquer atividade ilícita às autoridades competentes.
                    </p>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Proteção de Dados</h2>
                    <p>
                        Todas as informações coletadas para fins de KYC e AML são armazenadas com segurança e tratadas de acordo com as leis de proteção de dados aplicáveis. O acesso a essas informações é estritamente limitado.
                    </p>
                </div>
            </div>
        </div>
    );
}
