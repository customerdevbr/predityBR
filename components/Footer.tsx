import Link from 'next/link';
import { HelpCircle, Mail, DollarSign } from 'lucide-react';
import packageInfo from '../package.json';

// JSON-LD para BreadcrumbList e SiteLinksSearchBox implícitos via links
const jsonLdFooter = {
    "@context": "https://schema.org",
    "@type": "WPFooter",
    "about": {
        "@type": "Organization",
        "name": "PredityBR",
        "url": "https://preditybr.com",
        "logo": "https://preditybr.com/logo.png",
        "description": "Plataforma brasileira de mercados de previsão em tempo real com pagamentos via PIX.",
        "areaServed": "BR",
        "availableLanguage": "pt-BR",
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "url": "https://preditybr.com/contact",
            "availableLanguage": "Portuguese",
        }
    }
};

export default function Footer() {
    return (
        <footer className="w-full bg-[#0f1115] border-t border-white/5 py-12" role="contentinfo" aria-label="Rodapé do site">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFooter) }}
            />

            <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="space-y-4">
                    <Link href="/" aria-label="Página inicial PredityBR">
                        <img src="/logo.png" alt="PredityBR — Mercados de Previsão" className="h-8 opacity-80" width={120} height={32} />
                    </Link>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        A plataforma de prediction markets mais rápida do Brasil. Preveja o futuro com transparência e segurança via PIX.
                    </p>
                    <div className="flex gap-4 pt-2">
                        <div className="p-2 bg-surface rounded-full text-2xl" aria-label="Feito no Brasil" role="img">
                            🇧🇷
                        </div>
                    </div>
                </div>

                {/* Plataforma */}
                <nav aria-label="Links da plataforma">
                    <h3 className="font-bold text-white mb-4">Plataforma</h3>
                    <ul className="space-y-2 text-sm text-gray-500">
                        <li><Link href="/app/markets" className="hover:text-primary transition-colors">Mercados</Link></li>
                        <li><Link href="/app/wallet" className="hover:text-primary transition-colors">Minha Carteira</Link></li>
                        <li><Link href="/rankings" className="hover:text-primary transition-colors">Ranking Geral</Link></li>
                        <li><Link href="/blog" className="hover:text-primary transition-colors">Blog & Análises</Link></li>
                        <li><Link href="/como-funciona" className="hover:text-primary transition-colors">Como Funciona</Link></li>
                    </ul>
                </nav>

                {/* Suporte */}
                <nav aria-label="Links de suporte">
                    <h3 className="font-bold text-white mb-4">Suporte</h3>
                    <ul className="space-y-2 text-sm text-gray-500">
                        <li>
                            <Link href="/como-funciona" className="hover:text-primary transition-colors flex items-center gap-2">
                                <HelpCircle className="w-3 h-3" aria-hidden="true" /> Como funciona?
                            </Link>
                        </li>
                        <li>
                            <Link href="/contact" className="hover:text-primary transition-colors flex items-center gap-2">
                                <Mail className="w-3 h-3" aria-hidden="true" /> Fale Conosco
                            </Link>
                        </li>
                        <li>
                            <Link href="/fees" className="hover:text-primary transition-colors flex items-center gap-2">
                                <DollarSign className="w-3 h-3" aria-hidden="true" /> Taxas e Limites
                            </Link>
                        </li>
                    </ul>
                </nav>

                {/* Compliance */}
                <nav aria-label="Links de compliance e segurança">
                    <h3 className="font-bold text-white mb-4">Segurança</h3>
                    <ul className="space-y-2 text-sm text-gray-500">
                        <li><Link href="/legal" className="hover:text-white transition-colors">Segurança Jurídica</Link></li>
                        <li><Link href="/privacy" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
                        <li><Link href="/kyc" className="hover:text-white transition-colors">Termos KYC / AML</Link></li>
                        <li><Link href="/responsible" className="hover:text-white transition-colors">Jogo Responsável</Link></li>
                    </ul>
                </nav>
            </div>

            <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-gray-600">
                <p className="mb-2">Criado com <span className="text-primary text-sm" aria-hidden="true">💚</span> por brasileiros para brasileiros.</p>
                <p>PredityBR &copy; {new Date().getFullYear()}. Todos os direitos reservados.
                    <span className="text-gray-500 ml-2 border-l border-gray-700 pl-2">v{packageInfo.version}</span>
                </p>
                <p className="mt-2 text-[10px] text-gray-700">
                    Proibido para menores de 18 anos. Pratique com moderação.
                    <Link href="/responsible" className="underline ml-1 hover:text-gray-500 transition-colors">Jogo Responsável</Link>
                </p>
            </div>
        </footer>
    );
}
