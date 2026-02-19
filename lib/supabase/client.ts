import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const isProd = process.env.NODE_ENV === 'production';
    // We need to check if we are on the custom domain to set the cookie correctly
    // But client-side we can just default to .preditybr.com if we are in prod and not on vercel.app
    // Actually, checking window.location is safer if possible, but env is easier for now.
    // Let's assume if it's PROD, we want .preditybr.com UNLESS it's a vercel URL.
    // Since we handle vercel URLs via middleware exemption, we can try to be checking window if available.

    // Simplest robust approach:
    // If we are on preditybr.com or app.preditybr.com, use .preditybr.com
    // If on vercel.app, use default.

    let cookieOptions = {};
    if (typeof window !== 'undefined' && window.location.hostname.includes('preditybr.com')) {
        cookieOptions = {
            domain: '.preditybr.com',
            path: '/',
            sameSite: 'lax',
        };
    }

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions
        }
    )
}
