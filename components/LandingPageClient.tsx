"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Trophy, Flame, Clock as ClockIcon, TrendingUp, List, ChevronRight } from 'lucide-react';
import MarketCard from '@/components/MarketCard';
import Footer from '@/components/Footer';
import HeroCardStack from '@/components/HeroCardStack';

const TYPING_WORDS = ["Política", "Futebol", "BBB", "Economia", "Oscar"];
const LP_CATEGORIES = ["INÍCIO", "TODAS", "POLÍTICA", "ECONOMIA", "ESPORTE", "CRIPTO", "CLIMA"];

interface LandingPageClientProps {
    featuredMarkets: any[];
    heroCards: any[];
}

export default function LandingPageClient({ featuredMarkets, heroCards }: LandingPageClientProps) {
    const [text, setText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [wordIndex, setWordIndex] = useState(0);
    const [activeTab, setActiveTab] = useState("INÍCIO");

    // Capture ?ref=CODE from URL and store in localStorage with 24h expiry
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
            const expires = Date.now() + 24 * 60 * 60 * 1000; // 24h
            localStorage.setItem('predity_ref', JSON.stringify({ code: ref.toUpperCase(), expires }));
        }
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

            {/* Barra de destaque PIX */}
            <div className="bg-[#151921] border-y border-white/5 py-2 mt-16 md:mt-24 md:py-3">
                <div className="container mx-auto px-4 flex items-center justify-center md:justify-start gap-4 text-xs md:text-sm">
                    <img src="/pix.avif" alt="PIX" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
                    <span className="font-bold text-gray-300">PIX Instantâneo — Depósito e saque 24 horas</span>
                </div>
            </div>

            {/* Hero Principal */}
            <section aria-labelledby="hero-heading" className="container mx-auto px-4 py-8 md:py-12 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="space-y-5 md:space-y-8 text-left">
                    <h1 id="hero-heading" className="text-[28px] leading-tight md:text-5xl lg:text-6xl font-black text-white">
                        Dê seu palpite no que o Brasil está acompanhando em <span className="text-primary inline-block min-w-[2ch]" aria-live="polite">{text}<span className="animate-pulse" aria-hidden="true">|</span></span>
                    </h1>

                    <p className="text-sm md:text-lg text-gray-400 max-w-lg leading-relaxed">
                        Participe das previsões mais comentadas do momento com odds formadas pela própria comunidade. Resultados rápidos, pagamento via PIX e experiência 100% brasileira.
                    </p>

                    <Link
                        href="/register"
                        className="inline-flex items-center justify-center w-full md:w-auto px-6 py-3.5 md:px-8 md:py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-base md:text-lg shadow-[0_0_20px_rgba(47,124,70,0.3)] md:shadow-[0_0_30px_rgba(47,124,70,0.3)] transition-all"
                        aria-label="Criar conta grátis na PredityBR"
                    >
                        Criar Conta Grátis
                    </Link>

                    {/* Trust badges */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 pt-2 md:pt-4">
                        <span className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 font-medium">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 flex-shrink-0" aria-hidden="true"></span>
                            Pagamento Via PIX
                        </span>
                        <span className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 font-medium">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 flex-shrink-0" aria-hidden="true"></span>
                            Suporte BR
                        </span>
                        <span className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 font-medium">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-yellow-500 flex-shrink-0" aria-hidden="true"></span>
                            Odds em Tempo Real
                        </span>
                        <span className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 font-medium">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-purple-500 flex-shrink-0" aria-hidden="true"></span>
                            Conta Grátis
                        </span>
                    </div>
                </div>

                {/* Hero Visual — Cards empilhados */}
                <div className="relative hidden md:flex h-[400px] items-center justify-center" aria-hidden="true">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-30"></div>
                    <HeroCardStack cards={heroCards} />
                </div>
            </section>

            {/* Seção de Prova Social */}
            <section aria-label="Por que usar a PredityBR" className="container mx-auto px-4 pb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {[
                        { value: "100%", label: "Mercados transparentes", icon: "🔍" },
                        { value: "PIX", label: "Saque instantâneo 24h", icon: "⚡" },
                        { value: "0%", label: "Taxa na criação de conta", icon: "🆓" },
                        { value: "BR", label: "Suporte em português", icon: "🇧🇷" },
                    ].map(({ value, label, icon }) => (
                        <div key={label} className="bg-surface/30 border border-white/5 rounded-xl p-3 md:p-4 text-center hover:border-primary/20 transition-colors">
                            <div className="text-xl mb-1" aria-hidden="true">{icon}</div>
                            <div className="text-lg md:text-xl font-black text-primary">{value}</div>
                            <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Catálogo de Mercados com Abas */}
            <section aria-labelledby="markets-heading" className="container mx-auto px-4 py-8 pb-24">
                <h2 id="markets-heading" className="sr-only">Mercados de Previsão Disponíveis</h2>
                {/* Abas */}
                <div className="border-b border-surface mb-8">
                    <div className="flex gap-6 overflow-x-auto pb-px scrollbar-hide">
                        {LP_CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveTab(cat)}
                                className={`pb-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 px-1 ${activeTab === cat
                                    ? "border-primary text-primary"
                                    : "border-transparent text-gray-400 hover:text-white"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === "INÍCIO" ? (
                    <div className="space-y-10">
                        {/* Em Alta - Mais Recentes */}
                        <div>
                            <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 text-xl shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                    🔥
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">Em Alta <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{featuredMarkets.length} mercados</span></h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Mercados recém abertos com grande potencial.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide">
                                {featuredMarkets.slice(0, 10).map(m => (
                                    <div key={m.id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] snap-start flex-shrink-0">
                                        <MarketCard {...m} pool={m.total_pool || 0} yesAmount={m.total_yes_amount || 0} noAmount={m.total_no_amount || 0} outcomes={m.outcomes} outcomePools={m.outcome_pools} outcomeImages={m.outcome_images} imageUrl={m.image_url} endDate={m.end_date} verticalLayout={true} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Encerra em Breve */}
                        {featuredMarkets.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 text-xl shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                        ⏳
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">Encerra em Breve <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Corra</span></h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Última chance para dar o seu palpite.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide">
                                    {[...featuredMarkets].sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()).slice(0, 10).map(m => (
                                        <div key={m.id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] snap-start flex-shrink-0">
                                            <MarketCard {...m} pool={m.total_pool || 0} yesAmount={m.total_yes_amount || 0} noAmount={m.total_no_amount || 0} outcomes={m.outcomes} outcomePools={m.outcome_pools} outcomeImages={m.outcome_images} imageUrl={m.image_url} endDate={m.end_date} verticalLayout={true} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Maior Volume */}
                        {featuredMarkets.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-xl shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                        📈
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">Maior Volume 24h <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Top</span></h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Onde a comunidade está colocando mais dinheiro.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide">
                                    {[...featuredMarkets].sort((a, b) => (b.total_pool || 0) - (a.total_pool || 0)).slice(0, 10).map(m => (
                                        <div key={m.id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] snap-start flex-shrink-0">
                                            <MarketCard {...m} pool={m.total_pool || 0} yesAmount={m.total_yes_amount || 0} noAmount={m.total_no_amount || 0} outcomes={m.outcomes} outcomePools={m.outcome_pools} outcomeImages={m.outcome_images} imageUrl={m.image_url} endDate={m.end_date} verticalLayout={true} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Demais Categorias */}
                        {LP_CATEGORIES.slice(2).map(cat => {
                            const catMarkets = featuredMarkets.filter(m => m.category === cat);
                            if (catMarkets.length === 0) return null;

                            // Define Emoji based on Category
                            let catEmoji = "🌐";
                            if (cat === "POLÍTICA") catEmoji = "🏛️";
                            if (cat === "ESPORTE") catEmoji = "⚽";
                            if (cat === "ECONOMIA") catEmoji = "💰";
                            if (cat === "CRIPTO") catEmoji = "₿";
                            if (cat === "CLIMA") catEmoji = "☀️";

                            return (
                                <div key={cat}>
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xl shadow-[0_0_15px_rgba(47,124,70,0.3)]">
                                            {catEmoji}
                                        </div>
                                        <div className="flex-1 flex justify-between items-center pr-2">
                                            <div>
                                                <h2 className="text-lg font-bold text-white flex items-center gap-2">{cat} <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{catMarkets.length} mercados</span></h2>
                                            </div>
                                            <button onClick={() => setActiveTab(cat)} className="text-xs font-bold flex items-center gap-1 text-primary hover:text-white transition-colors">
                                                Ver Todos <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x scrollbar-hide">
                                        {catMarkets.map(m => (
                                            <div key={m.id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] snap-start flex-shrink-0">
                                                <MarketCard {...m} pool={m.total_pool || 0} yesAmount={m.total_yes_amount || 0} noAmount={m.total_no_amount || 0} outcomes={m.outcomes} outcomePools={m.outcome_pools} outcomeImages={m.outcome_images} imageUrl={m.image_url} endDate={m.end_date} verticalLayout={true} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Grid Tradicional para 'TODAS' ou Categorias Específicas */
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuredMarkets.filter(m => activeTab === "TODAS" || m.category === activeTab).map((market) => (
                            <MarketCard
                                key={market.id}
                                id={market.id}
                                title={market.title}
                                category={market.category}
                                imageUrl={market.image_url}
                                endDate={market.end_date}
                                pool={market.total_pool || 0}
                                yesAmount={market.total_yes_amount || 0}
                                noAmount={market.total_no_amount || 0}
                                metadata={market.metadata}
                            />
                        ))}
                        {featuredMarkets.filter(m => activeTab === "TODAS" || m.category === activeTab).length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-500 bg-surface/30 rounded-xl border border-white/5">
                                Nenhum mercado aberto para esta categoria no momento.
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Footer */}
            <div className="relative z-10 bg-[#0f1115]">
                <Footer />
            </div>
        </div>
    );
}
