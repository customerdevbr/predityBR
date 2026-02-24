import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    // 1. Update Session (Standard Supabase Auth)
    // This allows us to access user session in the middleware
    const response = await updateSession(request)

    // 2. Subdomain & Path Logic
    const url = request.nextUrl
    const hostname = request.headers.get('host') || ''

    // Check if we are on the "app" subdomain (e.g. app.preditybr.com or app.localhost:3000)
    // We also support 'localhost' for dev environment testing if needed, but primarily relying on subdomain presence.
    const isAppSubdomain = hostname.startsWith('app.');

    // Create a Supabase client to check auth status
    // Note: We reuse the logic from updateSession but here we need explicit check for redirection
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    // We don't set cookies here, updateSession handled it
                },
                remove(name: string, options: CookieOptions) {
                    // We don't remove cookies here
                },
            },
        }
    )
    const { data: { user } } = await supabase.auth.getUser()

    // --- GLOBAL EXEMPTIONS (API, Auth, Debug, Static) ---
    // Must be before any redirect logic to avoid loops or blocking valid assets/endpoints
    if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/api') || url.pathname.startsWith('/debug-cookie')) {
        return response;
    }

    // --- LOGIC FOR APP SUBDOMAIN (app.preditybr.com) ---
    if (isAppSubdomain) {
        // If user is NOT logged in, redirect to Main Domain Login
        if (!user && !url.pathname.startsWith('/login') && !url.pathname.startsWith('/register')) {
            // Strip 'app.' to get back to root domain (e.g. preditybr.com)
            const rootHostname = hostname.replace(/^app\./, '');
            return NextResponse.redirect(`https://${rootHostname}/login`, 307);
        }

        // Rewrite Logic: Mapped "app" subdomain to "/app" folder structure
        // If user visits app.preditybr.com/, internally serve /app
        // If user visits app.preditybr.com/markets, internally serve /app/markets

        let pathName = url.pathname;
        if (pathName === '/') {
            pathName = '/app';
        } else if (!pathName.startsWith('/app') && !pathName.startsWith('/_next') && !pathName.includes('.')) {
            pathName = `/app${pathName}`;
        }

        return NextResponse.rewrite(new URL(pathName, request.url));
    }

    // --- LOGIC FOR MAIN DOMAIN (preditybr.com OR vercel.app) ---
    else {
        // Special handling for Vercel Preview/Production URLs (predity-br.vercel.app)
        const isVercelDomain = hostname.includes('vercel.app');

        // EXEMPT API & AUTH & DEBUG ROUTES from Redirects
        if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/api') || url.pathname.startsWith('/debug-cookie')) {
            return response;
        }

        // If User is Authenticated:
        if (user && (url.pathname === '/' || url.pathname.startsWith('/login') || url.pathname.startsWith('/register'))) {
            // If Vercel Domain -> Redirect to /app/markets (Path-based)
            if (isVercelDomain) {
                return NextResponse.redirect(new URL('/app/markets', request.url));
            }

            // If Custom Domain -> Redirect to app.preditybr.com
            // Strip 'www.' if present to avoid app.www.preditybr.com
            const rootHostname = hostname.replace(/^www\./, '');
            const appDomain = `app.${rootHostname}`;
            return NextResponse.redirect(`https://${appDomain}`, 307);
        }

        // 2. If visiting /app/*
        if (url.pathname.startsWith('/app')) {
            // If Vercel Domain -> ALLOW
            if (isVercelDomain) {
                return response;
            }

            // If Custom Domain -> Redirect to App Subdomain (clean URL)
            const rootHostname = hostname.replace(/^www\./, '');
            const appDomain = `app.${rootHostname}`;
            const cleanPath = url.pathname.replace('/app', '') || '/';
            return NextResponse.redirect(`https://${appDomain}${cleanPath}`, 307);
        }

        // Main domain serves Landing Page (app/page.tsx) by default.
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
