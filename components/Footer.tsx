import Link from 'next/link';
import { Globe, Smartphone, HelpCircle, Mail, DollarSign } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full bg-[#0f1115] border-t border-white/5 py-12">
            <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="space-y-4">
                    <img src="/logo.png" alt="Predity" className="h-8 opacity-80" />
                    <p className="text-gray-500 text-sm leading-relaxed">
                        A plataforma de prediction markets mais rápida do Brasil. Preveja o futuro com transparência e segurança via PIX.
                    </p>
                    <div className="flex gap-4 pt-2">
                        <Link href="#" className="p-2 bg-surface rounded-full text-gray-400 hover:text-white transition-colors">
                            <Globe className="w-4 h-4" />
                        </Link>
                        <Link href="#" className="p-2 bg-surface rounded-full text-gray-400 hover:text-white transition-colors">
                            <Smartphone className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Column 1 */}
                <div>
                    <h4 className="font-bold text-white mb-4">Plataforma</h4>
                    <ul className="space-y-2 text-sm text-gray-500">
                        <li><Link href="/app" className="hover:text-primary transition-colors">Mercados</Link></li>
                        <li><Link href="/app/wallet" className="hover:text-primary transition-colors">Minha Carteira</Link></li>
                        <li><Link href="/rankings" className="hover:text-primary transition-colors">Ranking Geral</Link></li>
                        <li><Link href="/blog" className="hover:text-primary transition-colors">Blog & Dicas</Link></li>
                    </ul>
                </div>

                {/* Column 2 */}
                <div>
                    <h3 className="font-bold text-white mb-4">Suporte</h3>
                    <ul className="space-y-2 text-sm text-gray-500">
                        <li><Link href="/como-funciona" className="hover:text-primary transition-colors flex items-center gap-2"><HelpCircle className="w-3 h-3" /> Como funciona?</Link></li>
                        <li><Link href="/help" className="hover:text-primary transition-colors flex items-center gap-2"><HelpCircle className="w-3 h-3" /> Central de Ajuda</Link></li>
                        <li><Link href="/contact" className="hover:text-primary transition-colors flex items-center gap-2"><Mail className="w-3 h-3" /> Fale Conosco</Link></li>
                        <li><Link href="/fees" className="hover:text-primary transition-colors flex items-center gap-2"><DollarSign className="w-3 h-3" /> Taxas e Limites</Link></li>
                    </ul>
                </div>

                {/* Compliance */}
                <div>
                    <h4 className="font-bold text-white mb-4">Segurança</h4>
                    <ul className="space-y-2 text-sm text-gray-500">
                        <li><Link href="/terms" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                        <li><Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link></li>
                        <li><Link href="/kyc" className="hover:text-white transition-colors">Política de KYC/AML</Link></li>
                        <li><Link href="/responsible" className="hover:text-white transition-colors">Jogo Responsável</Link></li>
                    </ul>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-gray-600">
                <p>&copy; 2024 PredityBR. Todos os direitos reservados.</p>
                <p className="mt-2">Proibido para menores de 18 anos. Jogue com moderação.</p>
            </div>
        </footer>
    );
}
