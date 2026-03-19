import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

const SITE_URL = 'https://preditybr.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    // Páginas estáticas públicas
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${SITE_URL}/register`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${SITE_URL}/login`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${SITE_URL}/como-funciona`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/rankings`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: `${SITE_URL}/blog`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${SITE_URL}/fees`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/contact`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/legal`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
        {
            url: `${SITE_URL}/privacy`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
        {
            url: `${SITE_URL}/kyc`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${SITE_URL}/responsible`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
    ];

    // Mercados abertos (dinâmicos)
    let marketPages: MetadataRoute.Sitemap = [];
    try {
        const supabase = await createClient();
        const { data: markets } = await supabase
            .from('markets')
            .select('id, slug, updated_at, category')
            .eq('status', 'OPEN')
            .order('updated_at', { ascending: false })
            .limit(200);

        if (markets) {
            marketPages = markets.map((m) => ({
                url: `${SITE_URL}/app/markets/${m.slug || m.id}`,
                lastModified: new Date(m.updated_at || now),
                changeFrequency: 'hourly' as const,
                priority: 0.8,
            }));
        }
    } catch {
        // silencia erro no build estático
    }

    return [...staticPages, ...marketPages];
}
