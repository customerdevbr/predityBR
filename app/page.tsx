"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp, ShieldCheck, Zap, Globe, Smartphone, BarChart3, Lock, HelpCircle, Mail, DollarSign } from 'lucide-react';
import MarketCard from '@/components/MarketCard';
import { supabase } from '@/lib/supabase';

// Mock Data for Landing Page
const featuredMarkets = [
    {
        id: '1',
        title: "Lula terminará o mandato em 2026?",
        category: "POLÍTICA",
        image_url: "https://placehold.co/600x400/233357/white?text=POLITICA",
        end_date: new Date(Date.now() + 86400000 * 300).toISOString(),
        total_pool: 15420.50,
        total_yes_amount: 8500,
        total_no_amount: 6920.50
    },
    {
        id: 'bbb-24',
        title: "Davi será o campeão do BBB 24?",
        category: "REALITY",
        image_url: "https://placehold.co/600x400/233357/white?text=BBB+24",
        end_date: new Date(Date.now() + 86400000 * 20).toISOString(),
        total_pool: 450000.00,
        total_yes_amount: 350000,
        total_no_amount: 100000
    },
    {
        id: 'cup-26',
        title: "Brasil vencerá a Copa de 2026?",
        category: "ESPORTE",
        image_url: "https://placehold.co/600x400/233357/white?text=COPA+26",
        end_date: new Date(Date.now() + 86400000 * 500).toISOString(),
        total_pool: 8900.00,
        total_yes_amount: 3000,
        total_no_amount: 5900
    },
    {
        id: 'btc-100k',
        title: "Bitcoin atinge $100k antes de Junho?",
        category: "CRIPTO",
        image_url: "https://placehold.co/600x400/233357/white?text=BTC",
        end_date: new Date(Date.now() + 86400000 * 90).toISOString(),
        total_pool: 125000.00,
        total_yes_amount: 60000,
        total_no_amount: 65000
    }
];

const TYPING_WORDS = ["política", "reality shows", "esportes", "economia", "criptomoedas", "clima"];

export default function LandingPage() {
    const [text, setText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    // Typewriter Effect
    useEffect(() => {
        const currentWord = TYPING_WORDS[wordIndex];
        const typeSpeed = isDeleting ? 50 : 100;

        const timer = setTimeout(() => {
            if (!isDeleting && text === currentWord) {
                // Finished typing word, wait then delete
                setTimeout(() => setIsDeleting(true), 2000);
            } else if (isDeleting && text === "") {
                // Finished deleting, move to next
                setIsDeleting(false);
                setWordIndex((prev) => (prev + 1) % TYPING_WORDS.length);
            } else {
                // Typing or Deleting
                setText(currentWord.substring(0, text.length + (isDeleting ? -1 : 1)));
            }
        }, typeSpeed);

        return () => clearTimeout(timer);
    }, [text, isDeleting, wordIndex]);

    return (
        <div className="flex flex-col min-h-screen">
            {/* 1. Slider Banner (Mock Placeholder) */}
            <div className="hidden md:block w-full h-12 bg-gradient-to-r from-primary/20 to-surface flex items-center justify-center border-b border-white/5">
                <p className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">
                    🚀 Bônus de boas-vindas: 100% no primeiro depósito até R$ 500
                </p>
            </div>

            {/* 2. PIX Destaque */}
            <div className="bg-[#151921] border-b border-white/5 py-3">
                <div className="container mx-auto px-4 flex items-center justify-center md:justify-start gap-3 text-sm">
                    <div className="bg-[#32BCAD]/10 p-1.5 rounded text-[#32BCAD]">
                        <Zap className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-gray-300">PIX Instantâneo — Depósito e saque 24 horas</span>
                </div>
            </div>

            {/* 3. Hero Principal */}
            <section className="container mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-8 text-left">
                    <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.1]">
                        Aposte no que o Brasil está acompanhando em <br />
                        <span className="text-primary min-h-[1.2em] inline-block mt-2">{text}<span className="animate-pulse">|</span></span>
                    </h1>

                    <p className="text-lg text-gray-400 max-w-lg leading-relaxed">
                        Participe das previsões mais comentadas do momento com odds formadas pela própria comunidade. Resultados rápidos e experiência simples.
                    </p>

                    <Link href="/register" className="inline-flex items-center justify-center px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg shadow-[0_0_30px_rgba(47,124,70,0.3)] hover:shadow-[0_0_40px_rgba(47,124,70,0.5)] transition-all transform hover:-translate-y-1">
                        Criar Conta Grátis
                    </Link>

                    <div className="flex items-center gap-6 text-sm text-gray-500 font-medium pt-4">
                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Pagamento Via PIX</span>
                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Suporte BR</span>
                    </div>
                </div>

                {/* Hero Feature Visual (Mock App Preview) */}
                <div className="relative hidden md:block">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-30"></div>
                    {/* Abstract Visual or Phone Mockup */}
                    <div className="relative z-10 bg-surface/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm rotate-3 hover:rotate-0 transition-all duration-700 ease-out shadow-2xl max-w-sm mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-bold text-gray-400">EM ALTA</span>
                            <div className="px-2 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold rounded">AO VIVO</div>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Davi será o campeão do BBB 24?</h4>
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 bg-surface h-2 rounded-full overflow-hidden">
                                <div className="bg-primary w-[75%] h-full"></div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1 bg-primary text-white py-3 rounded-lg text-center font-bold">SIM 1.30x</div>
                            <div className="flex-1 bg-gray-700 text-gray-400 py-3 rounded-lg text-center font-bold">NÃO 4.20x</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Feature Cards */}
            <section className="container mx-auto px-4 py-16">
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Card 1 */}
                    <div className="bg-surface/30 border border-white/5 p-8 rounded-2xl hover:bg-surface/50 transition-colors">
                        <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-6">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Pix na hora</h3>
                        <p className="text-gray-400 leading-relaxed">Depósitos e saques via Pix. Aprovação de saque em até 24 horas para sua total comodidade.</p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-surface/30 border border-white/5 p-8 rounded-2xl hover:bg-surface/50 transition-colors">
                        <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center mb-6">
                            <Globe className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Apostas brasileiras</h3>
                        <p className="text-gray-400 leading-relaxed">Política, BBB, eleições, Copa e economia. Eventos que o país acompanha em tempo real.</p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-surface/30 border border-white/5 p-8 rounded-2xl hover:bg-surface/50 transition-colors">
                        <div className="w-12 h-12 bg-yellow-500/20 text-yellow-500 rounded-xl flex items-center justify-center mb-6">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Melhores Odds</h3>
                        <p className="text-gray-400 leading-relaxed">Odds formadas pela demanda dos usuários (Pool). Sem margens abusivas da casa.</p>
                    </div>
                </div>
            </section>

            {/* 5. Catálogo Apostas */}
            <section className="container mx-auto px-4 py-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Todas as apostas</h2>
                        <p className="text-gray-400">Explore os mercados mais quentes do momento</p>
                    </div>

                    {/* Categories Mock */}
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        {['Todos', 'Política', 'Esportes', 'Reality', 'Cripto'].map((cat, i) => (
                            <button key={cat} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${i === 0 ? 'bg-white text-black' : 'bg-surface text-gray-400 hover:text-white'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredMarkets.map((market) => (
                        <MarketCard
                            key={market.id}
                            id={market.id}
                            title={market.title}
                            category={market.category}
                            imageUrl={market.image_url}
                            endDate={market.end_date}
                            pool={market.total_pool}
                            yesAmount={market.total_yes_amount}
                            noAmount={market.total_no_amount}
                        />
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Link href="/markets" className="inline-flex items-center gap-2 text-primary font-bold hover:text-primary/80 transition-colors">
                        Ver todos os mercados <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* 6. Footer */}
            <footer className="bg-[#0b0c0f] border-t border-white/5 pt-16 pb-8">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-12 mb-12">
                        {/* Col 1 */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <img src="/logo.png" alt="PredityBR" className="h-8 md:h-10 w-auto" />
                                {/* Logo text removed per previous requests, using img only */}
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                                Plataforma de entretenimento interativo baseada em previsões de eventos reais. Acompanhe, aposte e ganhe com o Brasil.
                            </p>
                        </div>

                        {/* Col 2 */}
                        <div className="space-y-4">
                            <h4 className="text-white font-bold uppercase tracking-wider text-sm">Plataforma</h4>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><Link href="#" className="hover:text-white transition-colors">Regras de Apostas</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">Como funciona o Pool</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">Taxas e Limites</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">FAQ</Link></li>
                            </ul>
                        </div>

                        {/* Col 3 */}
                        <div className="space-y-4">
                            <h4 className="text-white font-bold uppercase tracking-wider text-sm">Suporte</h4>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><Link href="#" className="hover:text-white transition-colors flex items-center gap-2"><Lock className="w-3 h-3" /> Segurança e Privacidade</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors flex items-center gap-2"><DollarSign className="w-3 h-3" /> Pagamentos</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors flex items-center gap-2"><HelpCircle className="w-3 h-3" /> Central de Ajuda</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors flex items-center gap-2"><Mail className="w-3 h-3" /> Contato</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
                        <p>&copy; 2026 PredityBR - Todos os direitos reservados.</p>
                        <div className="flex gap-6">
                            <Link href="#" className="hover:text-gray-400">Termos de Uso</Link>
                            <Link href="#" className="hover:text-gray-400">Política de Privacidade</Link>
                            <Link href="#" className="hover:text-gray-400">Jogo Responsável</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
