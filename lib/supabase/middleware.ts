import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // Dynamic Cookie Domain Logic
                        const hostname = request.headers.get('host') || '';
                        let domainOption = {};

                        // Only set cross-subdomain cookie if we are strictly on the official domain
                        if (hostname.includes('preditybr.com')) {
                            domainOption = { domain: '.preditybr.com' };
                        }

                        supabaseResponse.cookies.set(name, value, {
                            ...options,
                            ...domainOption,
                            sameSite: 'lax', // Required for cross-subdomain
                        })
                    })
                },
            },
        }
    )

    // Refreshing the auth token
    await supabase.auth.getUser()

    return supabaseResponse
}
