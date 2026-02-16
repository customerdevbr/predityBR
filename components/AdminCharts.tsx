"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface AdminChartsProps {
    revenueData: any[]; // { date: 'DD/MM', amount: number }
    categoryData: any[]; // { name: 'Category', value: number }
    userGrowthData: any[]; // { date: 'DD/MM', users: number }
}

export default function AdminCharts({ revenueData, categoryData, userGrowthData }: AdminChartsProps) {
    return (
        <div className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Revenue/Volume Chart */}
                <div className="bg-surface/30 border border-surface rounded-xl p-6 h-96 flex flex-col">
                    <h3 className="text-white font-bold mb-4">Volume Apostado (Últimos 7 dias)</h3>
                    <div className="w-full h-full min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#6b7280"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `R$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1d24', borderColor: '#333' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                />
                                <Bar dataKey="amount" fill="#32BCAD" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Categories Distribution */}
                <div className="bg-surface/30 border border-surface rounded-xl p-6 h-96 flex flex-col">
                    <h3 className="text-white font-bold mb-4">Apostas por Categoria</h3>
                    <div className="w-full h-full min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1d24', borderColor: '#333' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* User Growth Chart */}
            <div className="bg-surface/30 border border-surface rounded-xl p-6 h-96 flex flex-col">
                <h3 className="text-white font-bold mb-4">Crescimento de Usuários</h3>
                <div className="w-full h-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={userGrowthData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#6b7280"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#6b7280"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1d24', borderColor: '#333' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="users"
                                stroke="#8884d8"
                                strokeWidth={3}
                                dot={{ fill: '#8884d8', strokeWidth: 2 }}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
