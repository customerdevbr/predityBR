"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, User as UserIcon, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BottomNav() {
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsAuthenticated(!!session);

            supabase.auth.onAuthStateChange((_event, session) => {
                setIsAuthenticated(!!session);
            });
        };
        checkAuth();
    }, []);

    if (!isAuthenticated) return null;

    const navItems = [
        { label: 'Mercados', href: '/markets', icon: TrendingUp },
        { label: 'Saldo', href: '/wallet', icon: Wallet },
        { label: 'Perfil', href: '/profile', icon: UserIcon }, // Assuming /profile or we reuse /admin for now? User asked for Profile page update. Let's point to /profile and we will create it.
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f1115] border-t border-white/10 px-6 py-3 z-50 md:hidden">
            <div className="flex justify-between items-center max-w-md mx-auto">
                {navItems.map(({ label, href, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'fill-primary/20' : ''}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
