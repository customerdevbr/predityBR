"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Users, DollarSign, Activity, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';

import AdminCharts from '@/components/AdminCharts';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        revenue: 0,
        users: 0,
        volume: 0,
        profit: 0
    });
    const [chartData, setChartData] = useState({
        revenueData: [],
        categoryData: [],
        userGrowthData: []
    });
    const [commissions, setCommissions] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);

        // 1. Total Users & Growth
        const { data: users, count: userCount } = await supabase
            .from('users')
            .select('created_at', { count: 'exact' })
            .order('created_at', { ascending: true });

        // User Growth Aggregation
        const userGrowthMap: Record<string, number> = {};
        let cumulativeUsers = 0;
        users?.forEach(u => {
            const date = new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            cumulativeUsers++;
            userGrowthMap[date] = cumulativeUsers;
        });
        const userGrowthData = Object.keys(userGrowthMap).map(date => ({ date, users: userGrowthMap[date] })).slice(-7); // Last 7 days

        // 2. Volume & Revenue Logic
        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, type, status, created_at')
            .order('created_at', { ascending: true });

        // Accurate Volume: Sum of all bets ever placed
        const { data: bets } = await supabase
            .from('bets')
            .select('amount, created_at');

        const volume = bets?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

        const revenue = transactions
            ?.filter(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED')
            .reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

        // Revenue/Volume Chart Aggregation (Last 7 Days)
        const volumeMap: Record<string, number> = {};
        bets?.forEach(b => {
            const date = new Date(b.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            volumeMap[date] = (volumeMap[date] || 0) + b.amount;
        });
        const revenueData = Object.keys(volumeMap).map(date => ({ date, amount: volumeMap[date] })).slice(-7);

        // 3. Categories Distribution
        const { data: markets } = await supabase.from('markets').select('category');
        const categoryMap: Record<string, number> = {};
        markets?.forEach(m => {
            categoryMap[m.category] = (categoryMap[m.category] || 0) + 1;
        });
        const categoryData = Object.keys(categoryMap).map(name => ({ name, value: categoryMap[name] }));

        // 4. Profit (35% of Volume)
        const profit = volume * 0.35;

        setStats({
            users: userCount || 0,
            volume,
            revenue,
            profit
        });

        setChartData({
            revenueData: revenueData as any,
            categoryData: categoryData as any,
            userGrowthData: userGrowthData as any
        });

        // 5. Recent Activity
        const { data: logs } = await supabase
            .from('transactions')
            .select('*, users(full_name)')
            .order('created_at', { ascending: false })
            .limit(20);

        if (logs) setRecentActivity(logs);

        // 6. Affiliate Commissions
        const { data: commissionsData } = await supabase
            .from('referral_commissions')
            .select('*, referrer:referrer_id(email, full_name), referred:referred_id(email, full_name)')
            .order('created_at', { ascending: false })
            .limit(20);
        if (commissionsData) setCommissions(commissionsData);

        setLoading(false);
    };

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('admin_dashboard')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'transactions' },
                (payload) => {
                    // Refresh data on new transaction
                    console.log('New Transaction:', payload);
                    fetchDashboardData();

                    // Optional: Optimistic update could happen here, but Refetch is safer for aggregations
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Visão Geral</h1>
                <div className="text-sm text-gray-400">Atualizado em tempo real</div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Receita Total (Depósitos)" value={`R$ ${stats.revenue.toFixed(2)}`} change="-" isPositive icon={DollarSign} />
                <KpiCard title="Usuários Cadastrados" value={stats.users} change="-" isPositive icon={Users} />
                <KpiCard title="Volume Aportado" value={`R$ ${stats.volume.toFixed(2)}`} change="Estimado" isPositive={false} icon={TrendingUp} />
                <KpiCard title="Lucro Estimado (35%)" value={`R$ ${stats.profit.toFixed(2)}`} change="Estimado" isPositive icon={Activity} />
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Charts Section */}
                <div className="lg:col-span-2 space-y-8">
                    <AdminCharts
                        revenueData={chartData.revenueData}
                        categoryData={chartData.categoryData}
                        userGrowthData={chartData.userGrowthData}
                    />
                </div>

                {/* Realtime Feed */}
            </div>

            {/* Affiliate Commissions */}
            <div className="mt-10">
                <h2 className="text-lg font-bold text-white mb-4">💸 Comissões de Afiliados</h2>
                <div className="bg-surface/30 border border-surface rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5 text-gray-400 text-xs uppercase">
                                <th className="p-4 text-left">Afiliado</th>
                                <th className="p-4 text-left">Indicado</th>
                                <th className="p-4 text-left">Comissão</th>
                                <th className="p-4 text-left">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {commissions.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhuma comissão ainda.</td></tr>
                            ) : commissions.map((c: any) => (
                                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-white">{c.referrer?.full_name || c.referrer?.email || '-'}</td>
                                    <td className="p-4 text-gray-300">{c.referred?.full_name || c.referred?.email || '-'}</td>
                                    <td className="p-4 text-green-400 font-bold font-mono">R$ {Number(c.amount).toFixed(2)}</td>
                                    <td className="p-4 text-gray-500">{format(new Date(c.created_at), 'dd/MM/yy HH:mm')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}

function KpiCard({ title, value, change, isPositive, icon: Icon }: any) {
    return (
        <div className="bg-surface/30 border border-surface p-6 rounded-xl">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-surface rounded-lg">
                    <Icon className="w-5 h-5 text-gray-300" />
                </div>
                {/* Change indicator removed for now as we don't have historical data comparison logic yet */}
            </div>
            <div>
                <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
                <p className="text-2xl font-bold text-white mt-1">{value}</p>
            </div>
        </div>
    );
}

function LogItem({ time, user, action, details, color = "text-gray-400" }: any) {
    return (
        <div className="flex gap-3 border-l-2 border-surface pl-3 py-1">
            <span className="text-gray-600 opacity-50">{time}</span>
            <div className="flex-1">
                <span className="text-gray-300 font-bold mr-2">{user}</span>
                <span className={`font-bold mr-2 ${color}`}>{action}</span>
                <span className="text-gray-500">{details}</span>
            </div>
        </div>
    );
}
