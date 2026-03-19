import { MetadataRoute } from 'next';

const SITE_URL = 'https://preditybr.com';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: [
                    '/',
                    '/como-funciona',
                    '/rankings',
                    '/blog',
                    '/fees',
                    '/contact',
                    '/legal',
                    '/privacy',
                    '/kyc',
                    '/responsible',
                    '/register',
                    '/login',
                    '/app/markets/',
                ],
                disallow: [
                    '/app/admin/',
                    '/app/wallet',
                    '/app/profile',
                    '/api/',
                    '/debug',
                    '/debug-cookie',
                    '/auth/',
                    '/forgot-password',
                    '/reset-password',
                ],
            },
            // Bloqueia bots de AI de raspar conteúdo
            {
                userAgent: 'GPTBot',
                disallow: ['/'],
            },
            {
                userAgent: 'ChatGPT-User',
                disallow: ['/'],
            },
            {
                userAgent: 'CCBot',
                disallow: ['/'],
            },
            {
                userAgent: 'anthropic-ai',
                disallow: ['/'],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
