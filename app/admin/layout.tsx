import Link from 'next/link';
import { LayoutDashboard, Users, Wallet, List, Shield, Activity, LifeBuoy } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const menuItems = [
        { label: "Visão Geral", icon: LayoutDashboard, href: "/admin" },
        { label: "Usuários", icon: Users, href: "/admin/users" },
        { label: "Financeiro", icon: Wallet, href: "/admin/finance" },
        { label: "Apostas", icon: List, href: "/admin/bets" },
        { label: "Segurança", icon: Shield, href: "/admin/security" },
        { label: "Atividades", icon: Activity, href: "/admin/activity" },
        { label: "Suporte", icon: LifeBuoy, href: "/admin/support" },
    ];

    return (
        <div className="flex min-h-[calc(100vh-100px)]">
            {/* Sidebar */}
            <aside className="w-64 border-r border-surface bg-secondary/20 hidden md:block">
                <div className="p-6">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Painel Admin</h2>
                </div>
                <nav className="space-y-1 px-4">
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
            <main className="flex-1 p-6 md:p-8">
                {children}
            </main>
        </div>
    );
}
