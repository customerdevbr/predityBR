import { HeartHandshake } from 'lucide-react';

export default function ResponsiblePage() {
    return (
        <div className="min-h-screen py-24 px-4 bg-[#0f1115]">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center gap-4 border-b border-white/10 pb-8">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <HeartHandshake className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Jogo Responsável</h1>
                        <p className="text-gray-400 mt-1">Sua diversão deve ser sempre consciente</p>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
                    <p>
                        A PredityBR acredita que o mercado de previsões deve ser uma forma de entretenimento agradável, baseada no conhecimento e na análise, e não uma fonte de problemas financeiros ou emocionais. O Jogo Responsável é um pilar fundamental da nossa operação.
                    </p>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Diretrizes para uma Prática Saudável</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Estabeleça limites:</strong> Defina limites de depósito e de tempo antes de começar a fazer suas previsões. A plataforma permite a gestão do seu saldo em carteira.</li>
                        <li><strong>Não persiga perdas:</strong> Se você fez uma previsão incorreta, aceite o resultado. Tentar recuperar o valor imediatamente pode levar a decisões impulsivas.</li>
                        <li><strong>Jogue com o que pode pagar:</strong> O dinheiro utilizado na PredityBR deve ser destinado ao entretenimento, nunca fundos essenciais para despesas do dia a dia (moradia, alimentação, educação).</li>
                        <li><strong>Mantenha o equilíbrio:</strong> Fazer previsões não deve interferir no seu trabalho, estudos, ou no convívio familiar e social.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Sinais de Alerta de Dependência</h2>
                    <p>Fique atento a comportamentos como:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Passar mais tempo na plataforma do que o planejado originalmente.</li>
                        <li>Gastar dinheiro destinado a outras responsabilidades financeiras.</li>
                        <li>Sentir ansiedade, irritabilidade ou tentar esconder suas atividades de apostas de pessoas próximas.</li>
                        <li>Fazer previsões como uma forma de escapar de problemas pessoais ou sentimentos negativos.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Restrição de Menores</h2>
                    <p>
                        A PredityBR é estritamente proibida para menores de 18 anos. Recomendamos que pais e responsáveis utilizem softwares de filtragem para impedir o acesso de menores a conteúdos inadequados.
                    </p>

                    <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Procure Ajuda Profissional</h2>
                    <p>
                        Se você sentir que está perdendo o controle ou que as previsões deixaram de ser apenas uma diversão, não hesite em buscar apoio especializado. Existem diversas organizações não governamentais e instituições de saúde (como os Jogadores Anônimos e o SUS) capacitadas para oferecer suporte confidencial e gratuito.
                    </p>
                </div>
            </div>
        </div>
    );
}
