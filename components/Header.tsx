"use client";

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, Wallet, TrendingUp, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    return (
        <header className="border-b border-surface bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="PredityBR Logo" className="w-8 h-8 rounded-full" />
                        <span className="font-bold text-xl tracking-wider text-white">PREDITY<span className="text-primary">BR</span></span>
                    </Link>
                </div>

                <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-400 items-center">
                    <Link href="/markets" className="hover:text-white transition-colors flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Mercados
                    </Link>
                    <Link href="/wallet" className="hover:text-white transition-colors flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Carteira
                    </Link>
                    {user && (
                        <Link href="/admin" className="hover:text-white transition-colors flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Admin
                        </Link>
                    )}
                </nav>

                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link href="/wallet" className="hidden md:flex items-center gap-2 bg-surface hover:bg-surface/80 px-3 py-1.5 rounded-full text-xs font-bold text-green-400 transition-colors border border-surface">
                                <Wallet className="w-3 h-3" />
                                <span>R$ 0,00</span> {/* TODO: Fetch real balance */}
                            </Link>

                            <div className="flex items-center gap-3">
                                <div className="text-right hidden md:block">
                                    <div className="text-xs font-bold text-white">{user.user_metadata.full_name || 'Usuário'}</div>
                                    <div className="text-[10px] text-gray-400 truncate max-w-[100px]">{user.email}</div>
                                </div>
                                <img
                                    src={user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                                    alt="Avatar"
                                    className="w-8 h-8 rounded-full bg-surface border border-surface"
                                />
                                <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors" title="Sair">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Link href="/login" className="px-4 py-2 bg-surface hover:bg-surface/80 rounded text-sm font-medium transition-colors text-white">Login</Link>
                            <Link href="/register" className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-bold transition-colors shadow-[0_0_15px_rgba(47,124,70,0.5)]">Criar Conta</Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
