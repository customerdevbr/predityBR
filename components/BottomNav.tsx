"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, User as UserIcon, TrendingUp, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BottomNav() {
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [supportOpen, setSupportOpen] = useState(false);

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

    // Dispatch a custom event that SupportChat can listen to
    const handleSupportClick = () => {
        window.dispatchEvent(new CustomEvent('toggle-support-chat'));
    };

    if (!isAuthenticated) return null;

    const navItems = [
        { label: 'Mercados', href: '/app/markets', icon: TrendingUp },
        { label: 'Saldo', href: '/app/wallet', icon: Wallet },
        { label: 'Perfil', href: '/app/profile', icon: UserIcon },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f1115] border-t border-white/10 px-6 py-3 z-50 md:hidden">
            <div className="flex justify-between items-center max-w-md mx-auto">
                {navItems.map(({ label, href, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <a
                            key={href}
                            href={
                                process.env.NODE_ENV === 'production' && !window.location.hostname.includes('vercel.app')
                                    ? `https://app.preditybr.com${href}`
                                    : href
                            }
                            className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'fill-white/10' : ''}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
                        </a>
                    )
                })}

                {/* Support icon — opens chat panel */}
                <button
                    onClick={handleSupportClick}
                    className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors"
                >
                    <MessageCircle className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Suporte</span>
                </button>
            </div>
        </div>
    );
}
