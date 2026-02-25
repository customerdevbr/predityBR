"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { LayoutDashboard, Users, Wallet, List, Shield, Activity, LifeBuoy, FileText } from 'lucide-react';
import packageJson from '@/package.json';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            // Check Admin Role
            const { data: profile, error } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            // Allow access only if role is ADMIN
            if (error || profile?.role !== 'ADMIN') {
                console.warn("Acesso negado: Usuário não é admin", error);
                router.push('/');
            } else {
                setLoading(false);
            }
        };
        checkAuth();
    }, [router]);

    const menuItems = [
        { label: "Visão Geral", icon: LayoutDashboard, href: "/app/admin" },
        { label: "Usuários", icon: Users, href: "/app/admin/users" },
        { label: "Financeiro", icon: Wallet, href: "/app/admin/finance" },
        { label: "Mercados", icon: List, href: "/app/admin/bets" },
        { label: "Segurança", icon: Shield, href: "/app/admin/security" },
        { label: "Atividades", icon: Activity, href: "/app/admin/activity" },
        { label: "Suporte", icon: LifeBuoy, href: "/app/admin/support" },
        { label: "Blog", icon: FileText, href: "/app/admin/blog" },
    ];

    if (loading) return <div className="min-h-screen bg-[#0f1115]" />;

    return (
        <div className="flex min-h-screen pt-20">
            {/* Sidebar */}
            <aside className="w-64 border-r border-surface bg-secondary/20 hidden md:block fixed h-full left-0 top-20 bottom-0 overflow-y-auto">
                <div className="p-6 flex items-center justify-between">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Painel Admin</h2>
                    <span className="text-[10px] font-mono bg-surface px-2 py-0.5 rounded text-gray-400">v{packageJson.version}</span>
                </div>
                <nav className="space-y-1 px-4 pb-24">
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-surface/50 transition-colors"
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Content */}
            <main className="flex-1 p-6 md:p-8 md:ml-64 pb-24">
                {children}
            </main>
        </div>
    );
}
