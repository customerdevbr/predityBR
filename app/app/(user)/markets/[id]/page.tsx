import { createServerClient } from '@supabase/ssr'; // Or ensure correct import for Server Components
import { cookies } from 'next/headers';
import MarketDetailClient from './MarketDetailClient';
import { Metadata } from 'next';

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
                images: ['https://preditybr.com/logoPredityBR.png'], // Fallback
            }
        };
    }

    const ogImage = market.image_url || 'https://preditybr.com/logoPredityBR.png';
    // Use market description if available, otherwise a dynamic default
    const description = market.description
        ? market.description.slice(0, 160) + (market.description.length > 160 ? '...' : '')
        : `Faça sua previsão: ${market.title}. Veja as odds atuais e participe!`;

    return {
        title: `${market.title} | Predity`,
        description: description,
        openGraph: {
            title: `${market.title} | Predity`,
            description: description,
            url: `https://app.preditybr.com/app/markets/${market.slug || market.id}`,
            siteName: 'Predity',
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
            title: market.title,
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

    return <MarketDetailClient initialMarket={market} currentUser={session?.user} />;
}
