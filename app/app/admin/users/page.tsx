"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Shield, User, DollarSign, MoreVertical, Eye, X } from 'lucide-react';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    // Format CPF for display: 01234567890 -> 012.345.678-90
    const formatCpfDisplay = (value?: string | null) => {
        if (!value) return null;
        const d = value.replace(/\D/g, '');
        if (d.length !== 11) return value; // Return as-is if not exactly 11 digits
        return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        if (data) setUsers(data);
        setLoading(false);
    };

    const toggleRole = async (userId: string, currentRole: string) => {
        if (!confirm(`Deseja alterar o papel para ${currentRole === 'ADMIN' ? 'USER' : 'ADMIN'}?`)) return;

        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        const { error } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            alert("Erro ao atualizar papel: " + error.message);
        } else {
            fetchUsers();
        }
    };

    const toggleStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'BANNED' ? 'ACTIVE' : 'BANNED';
        const action = currentStatus === 'BANNED' ? 'desbanir' : 'banir';

        if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) return;

        const { error } = await supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', userId);

        if (error) {
            alert("Erro ao atualizar status: " + error.message);
        } else {
            fetchUsers();
        }
    };

    const filteredUsers = users.filter(user =>
        (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gerenciar Usuários</h1>
                    <p className="text-gray-400 text-sm">{users.length} usuários cadastrados</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-surface/30 border border-white/5 p-4 rounded-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, email ou ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-surface/30 border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-surface/50 text-gray-400 font-medium uppercase tracking-wider">
                            <tr>
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Role / Status</th>
                                <th className="p-4">Saldo</th>
                                <th className="p-4">Cadastro</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-surface/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-gray-400">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">
                                                        {user.full_name || 'Sem nome'}
                                                        {user.id === 'YOUR_ADMIN_ID_HERE' && ( // Optional: highlight self
                                                            <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1 rounded">VOCÊ</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{user.email || 'Email oculto'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-surface border border-white/10 text-gray-400'}`}>
                                                    {user.role || 'USER'}
                                                </span>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.status === 'BANNED' ? 'bg-red-500/20 text-red-500' : 'text-green-500'}`}>
                                                    {user.status || 'ACTIVE'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono">
                                            <div className="flex items-center gap-1 text-green-400">
                                                <DollarSign className="w-3 h-3" />
                                                {user.balance?.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-500 text-xs">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    className="p-2 hover:bg-white/10 rounded text-blue-400 hover:text-blue-300 transition-colors"
                                                    title="Ver Detalhes"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleRole(user.id, user.role)}
                                                    className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                                                    title="Promover/Rebaixar (Admin)"
                                                >
                                                    <Shield className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleStatus(user.id, user.status)}
                                                    className={`p-2 hover:bg-white/10 rounded transition-colors ${user.status === 'BANNED' ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'}`}
                                                    title={user.status === 'BANNED' ? "Desbanir Usuário" : "Banir Usuário"}
                                                >
                                                    <User className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
                    <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="font-bold text-lg text-white">Detalhes do Usuário</h3>
                            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-gray-400">
                                    <User className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl text-white">{selectedUser.full_name || 'Sem nome'}</h4>
                                    <p className="text-gray-400">{selectedUser.email}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-500 mb-1">CPF / Documento</div>
                                    <div className="font-mono text-sm text-gray-200">
                                        {formatCpfDisplay(selectedUser.document || selectedUser.cpf) || 'Não informado'}
                                    </div>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-500 mb-1">Nascimento</div>
                                    <div className="text-sm text-gray-200">{selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString('pt-BR') : 'Não informado'}</div>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-500 mb-1">ID do Usuário</div>
                                    <div className="font-mono text-xs text-gray-400 break-all">{selectedUser.id}</div>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-500 mb-1">Data de Cadastro</div>
                                    <div className="text-sm text-gray-200">{new Date(selectedUser.created_at).toLocaleString('pt-BR')}</div>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-500 mb-1">Saldo Atual</div>
                                    <div className="text-sm font-bold text-green-400">R$ {(selectedUser.balance || 0).toFixed(2)}</div>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                    <div className="text-xs text-gray-500 mb-1">Status / Papel</div>
                                    <div className="flex gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedUser.status === 'BANNED' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                            {selectedUser.status || 'ACTIVE'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-gray-300">
                                            {selectedUser.role || 'USER'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5 col-span-2">
                                    <div className="text-xs text-gray-500 mb-1">XGate Customer ID</div>
                                    <div className="font-mono text-sm text-primary break-all">{selectedUser.xgate_customer_id || 'Não gerado'}</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/5 bg-black/40 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="px-4 py-2 bg-surface hover:bg-white/10 text-white rounded-lg text-sm font-bold transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
