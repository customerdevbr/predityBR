import Link from 'next/link';
import { ArrowRight, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import MarketCard from '@/components/MarketCard';

export default function Home() {
    // Mock Data matching new categories
    const featuredMarkets = [
        {
            id: '1',
            title: "Lula terminará o mandato em 2026?",
            category: "POLÍTICA",
            image_url: "https://placehold.co/600x400/233357/white?text=LULA",
            end_date: new Date(Date.now() + 86400000 * 300).toISOString(),
            total_pool: 15420.50,
            total_yes_amount: 8500,
            total_no_amount: 6920.50
        },
        {
            id: '2',
            title: "Bitcoin atingirá $100k em 2026?",
            category: "CRIPTO",
            image_url: "https://placehold.co/600x400/233357/white?text=BTC",
            end_date: new Date(Date.now() + 86400000 * 120).toISOString(),
            total_pool: 45000.00,
            total_yes_amount: 25000,
            total_no_amount: 20000
        },
        {
            id: '3',
            title: "Brasil vencerá a Copa de 2026?",
            category: "ESPORTE",
            image_url: "https://placehold.co/600x400/233357/white?text=BRASIL",
            end_date: new Date(Date.now() + 86400000 * 500).toISOString(),
            total_pool: 8900.00,
            total_yes_amount: 3000,
            total_no_amount: 5900
        },
    ];

    return (
        <div className="space-y-20">
            {/* Hero Section */}
            <section className="text-center space-y-8 py-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 blur-[120px] -z-10 rounded-full scale-150 opacity-50"></div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-tight">
                    Mercados de eventos do <span className="text-primary">mundo real</span>
                </h1>

                <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Negocie sobre política, economia, esporte, cripto e clima.
                    Probabilidades definidas pela comunidade via PIX.
                </p>

                <div className="flex justify-center gap-4 pt-6">
                    <Link href="/markets" className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-lg transition-all shadow-[0_0_20px_rgba(47,124,70,0.3)] hover:shadow-[0_0_30px_rgba(47,124,70,0.5)] transform hover:-translate-y-1">
                        Começar a Negociar
                    </Link>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto pt-12 opacity-80">
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-surface/50 rounded-full text-primary">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold">Seguro & Transparente</h3>
                        <p className="text-xs text-gray-500 max-w-[200px]">Transações via blockchain e auditoria pública.</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-surface/50 rounded-full text-primary">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold">Liquidez Instantânea</h3>
                        <p className="text-xs text-gray-500 max-w-[200px]">Depósitos e saques via PIX em segundos.</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-surface/50 rounded-full text-primary">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold">Odds Dinâmicas</h3>
                        <p className="text-xs text-gray-500 max-w-[200px]">Preços definidos pela oferta e demanda real.</p>
                    </div>
                </div>
            </section>

            {/* Featured Markets */}
            <section>
                <div className="flex items-end justify-between mb-8 border-b border-white/5 pb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="text-primary" /> Destaques
                    </h2>
                    <Link href="/markets" className="text-primary hover:text-white transition-colors flex items-center gap-1 text-sm font-bold">
                        Ver todos <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            </section>
        </div>
    );
}
