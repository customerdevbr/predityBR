"use client";

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, Wallet, TrendingUp, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header({ user: initialUser }: { user: User | null }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(initialUser);
    const [isAdmin, setIsAdmin] = useState(false);

    const [balance, setBalance] = useState(0);

    useEffect(() => {
        // Sync state with prop
        setUser(initialUser);
    }, [initialUser]);

    // Fetch Balance
    const fetchBalance = async (userId: string) => {
        const { data } = await supabase.from('users').select('balance').eq('id', userId).single();
        if (data) setBalance(data.balance);
    };

    useEffect(() => {
        const checkRole = async (uid: string) => {
            const { data } = await supabase
                .from('users')
                .select('role')
                .eq('id', uid)
                .single();
            if (data?.role === 'ADMIN') setIsAdmin(true);
        };

        if (user) {
            checkRole(user.id);
            fetchBalance(user.id);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setIsAdmin(false);
            if (session?.user) {
                checkRole(session.user.id);
                fetchBalance(session.user.id);
            } else {
                setBalance(0);
                setIsAdmin(false);
            }
        });

        // Listen for Balance Updates (Realtime)
        const channel = supabase
            .channel('header_balance_updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: user ? `id=eq.${user.id}` : undefined
                },
                (payload) => {
                    const newBal = (payload.new as any).balance;
                    if (newBal !== undefined) setBalance(newBal);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, [user?.id]); // specific dependency to avoid loops

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    // Helper to get correct href
    const getAppUrl = (path: string) => {
        // NO CHANGE NEEDED if previous edit worked.
        // But I will verify the 'logout' logic.
        // Logout calls supabase.auth.signOut() then router.refresh().
        // This might just reload the current page. If on App, it should redirect to login (via middleware).
        // If on LP, it just clears state.
        // Seems fine.
        // If we are already on app subdomain (client-side check), relative is fine.
        // But to be safe and avoid CORS/Redirect issues from LP, we can force absolute URL.
        // During hydration, this might mismatch if we rely on window.
        // Let's use a simpler approach:
        // In PROD, if we are on 'preditybr.com', we MUST link to 'https://app.preditybr.com'.
        // We can just ALWAYS use the full URL for cross-subdomain links if we want to be safe.
        // But for SPA navigation within App, we want client-side routing.

        // Strategy: 
        // 1. If user is logged in, they should be on App subdomain anyway (middleware redirects).
        // 2. But if they somehow landed on LP with a session (e.g. just logged in), we want to get them to App.

        if (typeof window !== 'undefined' && !window.location.hostname.startsWith('app.') && !window.location.hostname.includes('vercel.app')) {
            return `https://app.preditybr.com${path}`;
        }
        return path;
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f1115]/90 backdrop-blur-md border-b border-white/5 h-16 transition-all">
            <div className="container mx-auto px-4 h-full flex items-center justify-between">

                {/* Logo Area */}
                <a href={user ? getAppUrl("/app/markets") : "/"} className="flex items-center gap-2">
                    <img src="/logo.png" alt="PredityBR Logo" className="h-10 w-auto" />
                </a>

                {/* Right Side: Auth / Balance */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            {/* Balance Badge */}
                            <a href={getAppUrl("/app/wallet")} className="flex items-center gap-2 bg-surface/50 hover:bg-surface border border-white/10 hover:border-primary/50 px-3 py-1.5 rounded-full transition-all group">
                                <span className="text-white font-bold text-xs">R$ {balance.toFixed(2)}</span>
                            </a>

                            {/* Deposit Button — glowing green CTA */}
                            <a
                                href={getAppUrl("/app/wallet")}
                                className="hidden sm:flex items-center gap-1.5 bg-primary hover:bg-primary/85 active:bg-primary/70 text-white font-black text-xs px-4 py-2 rounded-full transition-all shadow-[0_0_14px_rgba(4,179,5,0.5)] hover:shadow-[0_0_22px_rgba(4,179,5,0.7)] whitespace-nowrap"
                                style={{ letterSpacing: '0.04em' }}
                            >
                                <span>DEPOSITAR</span>
                            </a>

                            {isAdmin && (
                                <a href={getAppUrl("/app/admin")} className="hidden md:flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 px-3 py-1.5 rounded-full transition-all group">
                                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                                    <span className="text-purple-400 font-bold text-xs group-hover:text-purple-300">Painel Admin</span>
                                </a>
                            )}

                            {/* Desktop Profile Info */}
                            <div className="hidden md:flex items-center gap-3 ml-2 border-l border-white/10 pl-4">
                                <div className="text-right">
                                    <div className="text-xs font-bold text-white max-w-[100px] truncate">{user.user_metadata.full_name?.split(' ')[0]}</div>
                                </div>
                                <button onClick={handleLogout} className="text-gray-400 hover:text-white" title="Sair">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex gap-2">
                            <Link href="/login" className="px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white">Login</Link>
                            <Link href="/register" className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded font-bold text-xs shadow-lg shadow-primary/20">Criar Conta</Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
