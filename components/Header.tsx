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
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f1115]/90 backdrop-blur-md border-b border-white/5 h-16 transition-all">
            <div className="container mx-auto px-4 h-full flex items-center justify-between">

                {/* Logo Area */}
                <Link href="/" className="flex items-center gap-2">
                    <img src="/logo.png" alt="PredityBR Logo" className="h-10 w-auto" />
                </Link>

                {/* Desktop Nav (Hidden on Mobile) */}
                <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-400 items-center">
                    <Link href="/markets" className="hover:text-white transition-colors flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Mercados
                    </Link>
                    <Link href="/wallet" className="hover:text-white transition-colors flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Carteira
                    </Link>
                </nav>

                {/* Right Side: Auth / Balance */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            {/* Balance Badge (Visible Mobile & Desktop) */}
                            <Link href="/wallet" className="flex items-center gap-2 bg-surface/50 hover:bg-surface border border-primary/20 hover:border-primary/50 px-3 py-1.5 rounded-full transition-all group">
                                <span className="text-primary font-bold text-xs group-hover:text-primary/80">R$ 0,00</span>
                                <div className="bg-primary text-white text-[10px] font-bold px-1.5 rounded">+</div>
                            </Link>

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
