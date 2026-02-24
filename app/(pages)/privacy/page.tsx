import { UserCheck } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen py-24 px-4 bg-[#0f1115]">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center gap-4 border-b border-white/10 pb-8">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <UserCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Política de Privacidade</h1>
                        <p className="text-gray-400 mt-1">Como cuidamos dos seus dados na PredityBR</p>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
                    <p>
                        A sua privacidade é de extrema importância para nós. Esta Política de Privacidade explica como a PredityBR coleta, utiliza, compartilha e protege as suas informações pessoais quando você acessa e utiliza nossa plataforma.
                    </p>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Informações que Coletamos</h2>
                    <p>Coletamos os seguintes tipos de informações:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Dados Cadastrais:</strong> Nome, CPF, e-mail e data de nascimento, essenciais para a verificação de identidade e criação de conta.</li>
                        <li><strong>Dados Financeiros:</strong> Histórico de transações, previsões realizadas, depósitos e saques (processados via PIX de forma segura).</li>
                        <li><strong>Dados de Navegação:</strong> Endereços IP, tipo de navegador, sistema operacional e informações sobre a sua interação com a plataforma (uso de cookies).</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Como Utilizamos Suas Informações</h2>
                    <p>As informações coletadas são utilizadas para:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Criar e gerenciar sua conta na PredityBR.</li>
                        <li>Processar transações financeiras e previsões.</li>
                        <li>Cumprir com obrigações legais e regulatórias (como KYC e AML).</li>
                        <li>Melhorar nossa plataforma, suporte ao cliente e personalizar a sua experiência.</li>
                        <li>Enviar comunicações de serviço, segurança e, com o seu consentimento, ofertas promocionais.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Compartilhamento de Dados</h2>
                    <p>
                        Não vendemos, alugamos ou comercializamos suas informações pessoais. Seus dados só são compartilhados nas seguintes circunstâncias:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Com provedores de serviço de pagamento estritamente para processar suas transações.</li>
                        <li>Quando exigido por lei, ordem judicial ou autoridades competentes.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Segurança das Informações</h2>
                    <p>
                        Implementamos medidas técnicas e organizacionais avançadas, incluindo criptografia e controle de acesso, para proteger seus dados contra acesso não autorizado, alteração ou destruição.
                    </p>
                </div>
            </div>
        </div>
    );
}
