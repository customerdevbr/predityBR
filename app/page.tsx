"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp, ShieldCheck, Zap, Globe, Smartphone, BarChart3, Lock, HelpCircle, Mail, DollarSign } from 'lucide-react';
import MarketCard from '@/components/MarketCard';
import { supabase } from '@/lib/supabase';

// Mock Data for Landing Page Market Catalog
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

// Short-term Daily/Weekly Questions for Hero Carousel
const heroCards = [
    {
        id: 'h1',
        title: "Dólar fecha acima de R$ 5,00 hoje?",
        category: "ECONOMIA",
        yes: 1.80,
        no: 2.10,
        pct: 55 // Yes Pct
    },
    {
        id: 'h2',
        title: "Chove em São Paulo neste fim de semana?",
        category: "CLIMA",
        yes: 1.20,
        no: 4.50,
        pct: 80
    },
    {
        id: 'h3',
        title: "Flamengo vence o próximo jogo?",
        category: "FUTEBOL",
        yes: 2.50,
        no: 1.50,
        pct: 40
    }
];

const TYPING_WORDS = ["política", "reality shows", "esportes", "economia", "criptomoedas", "clima"];

export default function LandingPage() {
    const [text, setText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    // Hero Card Rotation State
    const [activeCardIndex, setActiveCardIndex] = useState(0);

    // Card Rotation Interval
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveCardIndex((prev) => (prev + 1) % heroCards.length);
        }, 4000); // Rotate every 4 seconds
        return () => clearInterval(interval);
    }, []);

    // Typewriter Effect
    useEffect(() => {
        const currentWord = TYPING_WORDS[wordIndex];
        const typeSpeed = isDeleting ? 50 : 100;

        const timer = setTimeout(() => {
            if (!isDeleting && text === currentWord) {
                setTimeout(() => setIsDeleting(true), 2000);
            } else if (isDeleting && text === "") {
                setIsDeleting(false);
                setWordIndex((prev) => (prev + 1) % TYPING_WORDS.length);
            } else {
                setText(currentWord.substring(0, text.length + (isDeleting ? -1 : 1)));
            }
        }, typeSpeed);

        return () => clearTimeout(timer);
    }, [text, isDeleting, wordIndex]);

    return (
        <div className="flex flex-col min-h-screen">

            {/* 1. Banner Slider (Top) */}
            <div className="w-full bg-[#0f1115] pt-16 md:pt-20"> {/* Offset for Fixed Header */}
                <div className="container mx-auto px-4">
                    <div className="w-full max-h-[600px] rounded-xl overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center">
                        <img src="/banner-pix.png" alt="Promo Banner" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>

            {/* 2. PIX Destaque */}
            <div className="bg-[#151921] border-y border-white/5 py-3 mt-8">
                <div className="container mx-auto px-4 flex items-center justify-center md:justify-start gap-3 text-sm">
                    <div className="bg-[#32BCAD]/10 p-1.5 rounded text-[#32BCAD]">
                        <Zap className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-gray-300">PIX Instantâneo — Depósito e saque 24 horas</span>
                </div>
            </div>

            {/* 3. Hero Principal */}
            <section className="container mx-auto px-4 py-12 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-8 text-left">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
                        Aposte no que o Brasil está acompanhando em <span className="text-primary inline-block min-w-[2ch]">{text}<span className="animate-pulse">|</span></span>
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

                {/* Hero Feature Visual (Stacking Cards) */}
                <div className="relative hidden md:block h-[400px] flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-30"></div>

                    {/* Cards Stack */}
                    <div className="relative w-full max-w-sm h-64">
                        {heroCards.map((card, index) => {
                            // Calculate position relative to active card
                            let offset = (index - activeCardIndex + heroCards.length) % heroCards.length;

                            // Visual States
                            const isActive = offset === 0;
                            const isNext = offset === 1;
                            const isPrev = offset === 2; // Last one in a loop of 3 acts like "behind"

                            return (
                                <div
                                    key={card.id}
                                    className={`absolute top-0 left-0 w-full bg-surface/80 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl transition-all duration-700 ease-in-out ${isActive
                                        ? 'z-30 opacity-100 scale-100 translate-y-0 rotate-0'
                                        : isNext
                                            ? 'z-20 opacity-60 scale-95 translate-y-4 rotate-2'
                                            : 'z-10 opacity-40 scale-90 translate-y-8 rotate-4'
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.category}</span>
                                        <div className="px-2 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold rounded animate-pulse">EXPIRA HOJE</div>
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-4 line-clamp-2">{card.title}</h4>

                                    <div className="flex gap-2 mb-4">
                                        <div className="flex-1 bg-surface h-2 rounded-full overflow-hidden">
                                            <div className="bg-primary h-full transition-all duration-500" style={{ width: `${card.pct}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-primary text-white py-3 rounded-lg text-center font-bold text-sm">SIM {card.yes.toFixed(2)}x</div>
                                        <div className="flex-1 bg-gray-700 text-gray-400 py-3 rounded-lg text-center font-bold text-sm">NÃO {card.no.toFixed(2)}x</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 4. Feature Cards */}
            <section className="container mx-auto px-4 py-10">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-surface/30 border border-white/5 p-8 rounded-2xl hover:bg-surface/50 transition-colors group">
                        <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Pix na hora</h3>
                        <p className="text-gray-400 leading-relaxed">Depósito instantâneo para você não perder nenhuma oportunidade. Saque rápido direto para sua conta.</p>
                    </div>

                    <div className="bg-surface/30 border border-white/5 p-8 rounded-2xl hover:bg-surface/50 transition-colors group">
                        <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Globe className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Apostas brasileiras</h3>
                        <p className="text-gray-400 leading-relaxed">Focado no que o Brasil fala: Reality Shows, Futebol, Política e Economia. Se é assunto, está aqui.</p>
                    </div>

                    <div className="bg-surface/30 border border-white/5 p-8 rounded-2xl hover:bg-surface/50 transition-colors group">
                        <div className="w-12 h-12 bg-yellow-500/20 text-yellow-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Melhores Odds</h3>
                        <p className="text-gray-400 leading-relaxed">Modelo de Pool: Odds definidas pela galera. Sem a casa jogando contra você, apenas taxas justas.</p>
                    </div>
                </div>
            </section>

            {/* 5. Catálogo Apostas */}
            <section className="container mx-auto px-4 py-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Todas as apostas</h2>
                        <p className="text-gray-400">Explore os mercados mais quentes do momento</p>
                    </div>

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
                        Ver todas as Apostas <ArrowRight className="w-4 h-4" />
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
