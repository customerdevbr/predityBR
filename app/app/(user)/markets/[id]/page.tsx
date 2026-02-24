import { createServerClient } from '@supabase/ssr'; // Or ensure correct import for Server Components
import { cookies } from 'next/headers';
import MarketDetailClient from './MarketDetailClient';
import { Metadata } from 'next';
import { Lock } from 'lucide-react';
import Link from 'next/link';

// 1. Data Fetching Logic (Reusable)
async function getMarket(rawId: string) {
    if (!rawId) return null;
    const idOrSlug = decodeURIComponent(rawId).trim();

    const cookieStore = await cookies();

    // Quick Setup for RSC Supabase:
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Create Client
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
            },
        },
    });

    // Check if likely UUID
    const looksLikeUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(idOrSlug);

    let data = null;
    let error = null;

    if (looksLikeUUID) {
        // Try ID first
        const result = await supabase.from('markets').select('*').eq('id', idOrSlug).maybeSingle();
        data = result.data;
        error = result.error;

        // If not found by ID, try generic slug lookup
        if (!data && !error) {
            const resultSlug = await supabase.from('markets').select('*').eq('slug', idOrSlug).maybeSingle();
            data = resultSlug.data;
            // Ensure we don't overwrite if error unless strictly necessary
        }
    } else {
        // Assume Slug
        const result = await supabase.from('markets').select('*').eq('slug', idOrSlug).maybeSingle();
        data = result.data;
        error = result.error;
    }

    if (error) {
        console.error("Error fetching market:", error);
    }

    return data;
}

// 2. Generate Metadata
// 2. Generate Metadata
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const params = await props.params;
    const market = await getMarket(params.id);

    if (!market) {
        return {
            title: 'Mercado não encontrado | Predity',
            description: 'O mercado que você procura não existe ou foi removido.',
            openGraph: {
                images: ['https://app.preditybr.com/logo.png'],
            }
        };
    }

    const ogImage = market.image_url || 'https://app.preditybr.com/logo.png';
    const description = market.description
        ? market.description.slice(0, 160) + (market.description.length > 160 ? '...' : '')
        : `Dê o seu palpite: ${market.title}. Veja as cotações atuais, aposte via PIX e participe dessa previsão na PredityBR!`;

    const title = `${market.title} | PredityBR`;

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            url: `https://app.preditybr.com/app/markets/${market.slug || market.id}`,
            siteName: 'PredityBR',
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: market.title,
                }
            ],
            type: 'website',
            locale: 'pt_BR',
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: [ogImage],
        }
    };
}

// 3. Page Component
export default async function MarketDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const market = await getMarket(params.id);
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
                // Server Component cannot set cookies
            },
        },
    });

    const { data: { session } } = await supabase.auth.getSession();

    if (!market) {
        return <div className="min-h-screen pt-20 text-center text-gray-400">Mercado não encontrado. Verifique o link.</div>;
    }

    if (market.status === 'RESOLVED') {
        if (!session?.user) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center pt-20">
                    <div className="bg-surface border border-white/5 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Mercado Encerrado</h2>
                        <p className="text-gray-400 text-sm mb-6">Este mercado já foi resolvido e está disponível apenas para usuários autenticados que realizaram previsões nele.</p>
                        <Link href="/app/markets" className="block w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors">Voltar aos mercados ativos</Link>
                    </div>
                </div>
            );
        }

        const { count, error: countError } = await supabase
            .from('bets')
            .select('*', { count: 'exact', head: true })
            .eq('market_id', market.id)
            .eq('user_id', session.user.id);

        if (countError) {
            console.error("Error checking user bets:", countError);
        }

        if (!count || count === 0) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center pt-20">
                    <div className="bg-surface border border-white/5 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="w-16 h-16 bg-gray-500/10 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
                        <p className="text-gray-400 text-sm mb-6">Este mercado já foi encerrado. Apenas os usuários que participaram das previsões possuem acesso ao resultado detalhado.</p>
                        <Link href="/app/markets" className="block w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors">Voltar aos mercados ativos</Link>
                    </div>
                </div>
            );
        }
    }

    return <MarketDetailClient initialMarket={market} currentUser={session?.user} />;
}
