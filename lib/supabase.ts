import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// cookie options logic for cross-subdomain auth
let cookieOptions = {};
if (typeof window !== 'undefined' && window.location.hostname.includes('preditybr.com')) {
    cookieOptions = {
        domain: '.preditybr.com',
        path: '/',
        sameSite: 'lax',
    };
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
    cookieOptions
});
